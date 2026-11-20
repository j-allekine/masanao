import "server-only";
import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";
import type { OpeningStockResult, OpeningStockSaveInput, OpeningStockWorkspace } from "../../opening-stock-types";
import { openingStockProduct, openingStockToday } from "../../domain/opening-stock";
import { listItemRecords } from "./items";

export const OPENING_STOCK_ID = "opening-stock";
export class OpeningStockGateError extends Error {}
type Failure = Extract<OpeningStockResult<never>, { ok: false }>;
class Rejected extends Error {
  constructor(readonly failure: Failure) { super(failure.error); }
}
function reject(kind: Failure["kind"], error: string): never { throw new Rejected({ ok: false, kind, error }); }

/** First statement obtains the same SQLite writer reservation as setup/save/discard. */
export async function assertOpeningStockGate(database: Prisma.TransactionClient) {
  await database.openingStockSetup.upsert({ where: { id: OPENING_STOCK_ID }, create: { id: OPENING_STOCK_ID }, update: { revision: { increment: 0 } } });
  const setup = await database.openingStockSetup.findUnique({ where: { id: OPENING_STOCK_ID }, select: { status: true } });
  if (setup?.status === "draft") throw new OpeningStockGateError("Opening Stock setup is in progress. An administrator must complete or discard the starting count before stock can move.");
}

async function authorize(database: Prisma.TransactionClient, actor: CurrentActor | null | undefined, manage: boolean) {
  if (!actor) reject("forbidden", "Sign in to view Opening Stock.");
  const user = await database.user.findFirst({ where: { id: actor.id, disabled: false, role: { in: manage ? ["admin"] : ["admin", "staff"] } }, select: { id: true, name: true, role: true } });
  if (!user) reject("forbidden", manage ? "Administrator access required." : "Staff access required.");
  return user;
}

async function run<T>(work: (database: Prisma.TransactionClient) => Promise<T>): Promise<OpeningStockResult<T>> {
  try { return { ok: true, value: await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }; }
  catch (error) {
    if (error instanceof Rejected) return error.failure;
    if ((error instanceof Error && /SQLITE_BUSY|database is locked|SocketTimeout/.test(error.message)) || (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P1008", "P2028"].includes(error.code))) return { ok: false, kind: "busy", error: "Another stock transaction is in progress. Try again; this attempt changed no stock." };
    throw error;
  }
}

async function claim(database: Prisma.TransactionClient) {
  return database.openingStockSetup.upsert({ where: { id: OPENING_STOCK_ID }, create: { id: OPENING_STOCK_ID }, update: { revision: { increment: 0 } }, include: { lines: { orderBy: { position: "asc" } } } });
}

export async function readOpeningStockWorkspaceRecord(actor: CurrentActor | null | undefined): Promise<OpeningStockResult<OpeningStockWorkspace>> {
  const result = await run(async (database) => {
    const user = await authorize(database, actor, false);
    const setup = await database.openingStockSetup.findUnique({ where: { id: OPENING_STOCK_ID }, include: { lines: { orderBy: { position: "asc" } } } });
    const hasHistory = Boolean(await database.inventoryLedgerMovement.findFirst({ select: { id: true } }));
    return {
      status: (setup?.status ?? "not-started") as OpeningStockWorkspace["status"], revision: setup?.revision ?? 0,
      attemptId: setup?.attemptId ?? null, countDate: setup?.countDate ?? "", note: setup?.note ?? "",
      canManage: user.role === "admin", eligible: !hasHistory,
      lines: setup?.lines ?? [],
      items: [],
    } satisfies OpeningStockWorkspace;
  });
  if (!result.ok) return result;
  const items = await listItemRecords();
  return { ok: true, value: { ...result.value, items: items.filter((item) => item.isActive && item.baseUnit.active) } };
}

export async function beginOpeningStockRecord(actor: CurrentActor | null | undefined, input: { attemptId: string; revision: number }): Promise<OpeningStockResult<{ revision: number }>> {
  return run(async (database) => {
    const setup = await claim(database);
    await authorize(database, actor, true);
    if (setup.status === "draft" && setup.attemptId === input.attemptId) return { revision: setup.revision };
    if (setup.status !== "not-started" || setup.revision !== input.revision || await database.openingStockDiscard.findUnique({ where: { attemptId: input.attemptId } })) reject("conflict", "Opening Stock setup changed. Reopen the current count before continuing.");
    if (await database.inventoryLedgerMovement.findFirst({ select: { id: true } })) reject("history", "Existing posted stock history prevents an opening balance. Use a clean operational start; existing records have not been changed.");
    const updated = await database.openingStockSetup.update({ where: { id: OPENING_STOCK_ID }, data: { status: "draft", attemptId: input.attemptId, revision: { increment: 1 }, countDate: openingStockToday() } });
    return { revision: updated.revision };
  });
}

export async function saveOpeningStockRecord(actor: CurrentActor | null | undefined, input: OpeningStockSaveInput): Promise<OpeningStockResult<{ revision: number }>> {
  return run(async (database) => {
    const setup = await claim(database);
    await authorize(database, actor, true);
    if (setup.status !== "draft" || setup.attemptId !== input.attemptId || setup.revision !== input.revision) reject("conflict", "This draft changed or was discarded. Reopen Opening Stock and review before saving.");
    const lines = [];
    for (const [position, line] of input.lines.entries()) {
      const item = await database.item.findFirst({ where: { id: line.itemId, isActive: true }, include: { baseUnit: true, unitConversions: { include: { alternateUnit: true } } } });
      if (!item || !item.baseUnit.active) reject("reference", `Line ${position + 1}: select an active Item and Base Unit.`);
      const conversion = line.conversionId ? item.unitConversions.find((entry) => entry.id === line.conversionId && entry.alternateUnitId === line.selectedUnitId && entry.alternateUnit.active) : null;
      const base = line.selectedUnitId === item.baseUnitId && line.conversionId === null;
      if (!base && !conversion) reject("reference", `${item.name}: the selected unit is unavailable. Select it again and review the conversion.`);
      const previous = setup.lines.find((entry) => entry.id === line.id);
      if (previous && previous.itemId !== line.itemId) reject("reference", "A saved count line cannot change its Item. Remove it and add the intended Item.");
      if (previous && previous.baseUnitId !== item.baseUnitId) reject("reference", `${item.name}: its Base Unit changed. Remove and reselect the Item.`);
      const unchanged = previous && previous.selectedUnitId === line.selectedUnitId && previous.conversionId === line.conversionId;
      const selected = conversion?.alternateUnit ?? item.baseUnit;
      const conversionFactor = unchanged ? previous.conversionFactor : conversion?.baseUnitQuantity ?? "1";
      lines.push({ ...line, position, openingStockId: OPENING_STOCK_ID, itemName: unchanged ? previous.itemName : item.name,
        selectedUnitName: unchanged ? previous.selectedUnitName : selected.name, selectedUnitAbbreviation: unchanged ? previous.selectedUnitAbbreviation : selected.abbreviation,
        baseUnitId: item.baseUnitId, baseUnitName: unchanged ? previous.baseUnitName : item.baseUnit.name, baseUnitAbbreviation: unchanged ? previous.baseUnitAbbreviation : item.baseUnit.abbreviation,
        conversionFactor, calculatedBaseUnitQuantity: openingStockProduct(line.quantity, conversionFactor), lineAmount: line.openingUnitCost === "" ? null : openingStockProduct(line.quantity, line.openingUnitCost) });
    }
    await database.openingStockLine.deleteMany({ where: { openingStockId: OPENING_STOCK_ID, id: { notIn: lines.map((line) => line.id) } } });
    for (const line of lines) {
      const { id, ...data } = line;
      await database.openingStockLine.upsert({ where: { id }, create: line, update: data });
    }
    const updated = await database.openingStockSetup.update({ where: { id: OPENING_STOCK_ID }, data: { countDate: input.countDate, note: input.note, revision: { increment: 1 } } });
    return { revision: updated.revision };
  });
}

export async function discardOpeningStockRecord(actor: CurrentActor | null | undefined, input: { attemptId: string; revision: number }): Promise<OpeningStockResult<{ revision: number; discardedAttemptId: string }>> {
  return run(async (database) => {
    const setup = await claim(database);
    const user = await authorize(database, actor, true);
    const prior = await database.openingStockDiscard.findUnique({ where: { attemptId: input.attemptId } });
    if (prior) return { revision: prior.resultingRevision, discardedAttemptId: prior.attemptId };
    if (setup.status !== "draft" || setup.attemptId !== input.attemptId || setup.revision !== input.revision) reject("conflict", "The setup changed. Reopen it before discarding this draft.");
    await database.openingStockLine.deleteMany({ where: { openingStockId: OPENING_STOCK_ID } });
    const updated = await database.openingStockSetup.update({ where: { id: OPENING_STOCK_ID }, data: { status: "not-started", attemptId: null, countDate: "", note: "", revision: { increment: 1 } } });
    await database.openingStockDiscard.create({ data: { attemptId: input.attemptId, openingStockId: OPENING_STOCK_ID, resultingRevision: updated.revision, actorId: user.id, actorName: user.name } });
    return { revision: updated.revision, discardedAttemptId: input.attemptId };
  });
}
