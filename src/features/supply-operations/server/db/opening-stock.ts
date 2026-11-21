import "server-only";
import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";
import type { OpeningStockResult, OpeningStockSaveInput, OpeningStockWorkspace } from "../../opening-stock-types";
import { openingStockProduct, openingStockToday, validOpeningStockDate } from "../../domain/opening-stock";
import { compareRational, decimalRational } from "@/features/issuance/domain/rational";
import { readOpeningStockCorrectionHistory } from "./opening-stock-corrections";
import { OpeningStockSourceError } from "./opening-stock-sources";
import { listItemRecords } from "./items";

export const OPENING_STOCK_ID = "opening-stock";
export class OpeningStockGateError extends Error {}
type Failure = Extract<OpeningStockResult<never>, { ok: false }>;
class Rejected extends Error {
  constructor(readonly failure: Failure) { super(failure.error); }
}
export function rejectOpeningStock(kind: Failure["kind"], error: string, fields?: Record<string, string>): never { throw new Rejected({ ok: false, kind, error, fields }); }

/** First statement obtains the same SQLite writer reservation as setup/save/discard. */
export async function assertOpeningStockGate(database: Prisma.TransactionClient, effectiveDate = openingStockToday()) {
  await database.openingStockSetup.upsert({ where: { id: OPENING_STOCK_ID }, create: { id: OPENING_STOCK_ID }, update: { revision: { increment: 0 } } });
  const setup = await database.openingStockSetup.findUnique({ where: { id: OPENING_STOCK_ID }, select: { status: true, countDate: true } });
  if (setup?.status === "draft") throw new OpeningStockGateError("Opening Stock setup is in progress. An administrator must complete or discard the starting count before stock can move.");
  if (setup?.status === "posted" && effectiveDate < setup.countDate) throw new OpeningStockGateError(`Stock transactions cannot be dated before Opening Stock on ${setup.countDate}.`);
}

export async function authorizeOpeningStock(database: Prisma.TransactionClient, actor: CurrentActor | null | undefined, manage: boolean) {
  if (!actor) rejectOpeningStock("forbidden", "Sign in to view Opening Stock.");
  const user = await database.user.findFirst({ where: { id: actor.id, disabled: false, role: { in: manage ? ["admin"] : ["admin", "staff"] } }, select: { id: true, name: true, role: true } });
  if (!user) rejectOpeningStock("forbidden", manage ? "Administrator access required." : "Staff access required.");
  return user;
}

export async function runOpeningStock<T>(work: (database: Prisma.TransactionClient) => Promise<T>): Promise<OpeningStockResult<T>> {
  try { return { ok: true, value: await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 15000 }) }; }
  catch (error) {
    if (error instanceof OpeningStockSourceError) return { ok: false, kind: "reference", error: error.message };
    if (error instanceof Rejected) return error.failure;
    if ((error instanceof Error && /SQLITE_BUSY|database is locked|SocketTimeout/.test(error.message)) || (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P1008", "P2028"].includes(error.code))) return { ok: false, kind: "busy", error: "Another stock transaction is in progress. Try again; this attempt changed no stock." };
    throw error;
  }
}

async function claim(database: Prisma.TransactionClient) {
  return database.openingStockSetup.upsert({ where: { id: OPENING_STOCK_ID }, create: { id: OPENING_STOCK_ID }, update: { revision: { increment: 0 } }, include: { lines: { orderBy: { position: "asc" } } } });
}

export async function readOpeningStockWorkspaceRecord(actor: CurrentActor | null | undefined): Promise<OpeningStockResult<OpeningStockWorkspace>> {
  const result = await runOpeningStock(async (database) => {
    const user = await authorizeOpeningStock(database, actor, false);
    const setup = await database.openingStockSetup.findUnique({ where: { id: OPENING_STOCK_ID }, include: { lines: { orderBy: { position: "asc" } } } });
    const hasHistory = Boolean(await database.inventoryLedgerMovement.findFirst({ select: { id: true } }));
    return {
      status: (setup?.status ?? "not-started") as OpeningStockWorkspace["status"], revision: setup?.revision ?? 0,
      attemptId: setup?.attemptId ?? null, countDate: setup?.countDate ?? "", note: setup?.note ?? "",
      reference: setup?.reference ?? "OS-0001", postedAt: setup?.postedAt?.toISOString() ?? null, postedByName: setup?.postedByName ?? null,
      canManage: user.role === "admin", eligible: !hasHistory,
      ...(setup?.status === "posted" ? await readOpeningStockCorrectionHistory(database, user.role === "admin") : {}),
      lines: setup?.lines ?? [],
      items: [],
    } satisfies OpeningStockWorkspace;
  });
  if (!result.ok) return result;
  const items = await listItemRecords();
  return { ok: true, value: { ...result.value, items: items.filter((item) => item.isActive && item.baseUnit.active) } };
}

/** Hooks are internal rollback-test seams; actions never accept them. */
export async function postOpeningStockRecord(actor: CurrentActor | null | undefined, input: { attemptId: string; revision: number; zeroCostAcknowledged: boolean }, hooks: { afterFirstMovement?: () => void } = {}): Promise<OpeningStockResult<{ revision: number }>> {
  return runOpeningStock(async (database) => {
    const setup = await claim(database);
    const user = await authorizeOpeningStock(database, actor, true);
    if (setup.status === "posted" && setup.attemptId === input.attemptId) return { revision: setup.revision };
    if (setup.status !== "draft" || setup.attemptId !== input.attemptId || setup.revision !== input.revision) rejectOpeningStock("conflict", "The count changed or was discarded. Reopen and review it before posting.");
    if (!validOpeningStockDate(setup.countDate)) rejectOpeningStock("validation", "Choose a count date no later than today in Manila.", { countDate: "Choose a real count date no later than today." });
    if (!setup.lines.length) rejectOpeningStock("validation", "Add and complete at least one counted Item before posting.");
    if (await database.inventoryLedgerMovement.findFirst({ select: { id: true } })) rejectOpeningStock("history", "Existing posted stock prevents an opening balance. No records have been changed.");
    const postedAt = new Date();
    for (const [index, line] of setup.lines.entries()) {
      const fields: Record<string, string> = {};
      let quantityValid = false; let costValid = false;
      try { quantityValid = decimalRational(line.quantity).numerator > BigInt(0); } catch {}
      try { costValid = line.openingUnitCost !== "" && decimalRational(line.openingUnitCost).numerator >= BigInt(0); } catch {}
      if (!quantityValid) fields[`lines.${index}.quantity`] = "Enter a positive counted quantity.";
      if (!costValid) fields[`lines.${index}.openingUnitCost`] = "Enter an explicit opening unit cost of zero or more.";
      if (costValid && decimalRational(line.openingUnitCost).numerator === BigInt(0)) {
        if (!line.zeroCostReason.trim()) fields[`lines.${index}.zeroCostReason`] = "Explain the assigned zero cost.";
        if (!input.zeroCostAcknowledged) fields.zeroCostAcknowledged = "Acknowledge the zero-cost lines in review.";
      }
      if (Object.keys(fields).length) rejectOpeningStock("validation", "Complete the highlighted count fields before posting.", fields);
      const item = await database.item.findFirst({ where: { id: line.itemId, isActive: true }, include: { baseUnit: true } });
      const selected = await database.unit.findFirst({ where: { id: line.selectedUnitId, active: true } });
      if (!item?.baseUnit.active || !selected || item.baseUnitId !== line.baseUnitId) rejectOpeningStock("reference", `${line.itemName}: Item or units changed. Reselect and review this line.`);
      const conversion = line.conversionId ? await database.itemUnitConversion.findFirst({ where: { id: line.conversionId, itemId: line.itemId, alternateUnitId: line.selectedUnitId } }) : null;
      const base = !line.conversionId && line.selectedUnitId === item.baseUnitId;
      if ((!base && !conversion) || (conversion && compareRational(decimalRational(conversion.baseUnitQuantity), decimalRational(line.conversionFactor)) !== 0)) rejectOpeningStock("reference", `${line.itemName}: its conversion changed. Remove and reselect the Item, then review its count.`);
      const quantity = openingStockProduct(line.quantity, line.conversionFactor);
      const amount = openingStockProduct(line.quantity, line.openingUnitCost);
      if (!quantity || !amount || decimalRational(quantity).numerator <= BigInt(0) || quantity !== line.calculatedBaseUnitQuantity || amount !== line.lineAmount) rejectOpeningStock("reference", `${line.itemName}: count evidence is incomplete. Save and review the line again.`);
      await database.openingStockLine.update({ where: { id: line.id }, data: { itemName: item.name, selectedUnitName: selected.name, selectedUnitAbbreviation: selected.abbreviation, baseUnitName: item.baseUnit.name, baseUnitAbbreviation: item.baseUnit.abbreviation } });
      const source = await database.openingStockSource.create({ data: { id: crypto.randomUUID(), openingStockId: setup.id, openingStockLineId: line.id, itemId: line.itemId, baseUnitId: line.baseUnitId, itemName: item.name, baseUnitName: item.baseUnit.name, baseUnitAbbreviation: item.baseUnit.abbreviation, reference: setup.reference, countDate: setup.countDate, position: line.position, quantity, amount, postedAt } });
      await database.inventoryLedgerMovement.create({ data: { id: crypto.randomUUID(), openingStockSourceId: source.id, itemId: line.itemId, baseUnitId: line.baseUnitId, quantity, movementType: "stock-in", occurredAt: new Date(`${setup.countDate}T00:00:00.000Z`) } });
      if (index === 0) hooks.afterFirstMovement?.();
    }
    const updated = await database.openingStockSetup.update({ where: { id: setup.id }, data: { status: "posted", revision: { increment: 1 }, postedAt, postedById: user.id, postedByName: user.name } });
    return { revision: updated.revision };
  });
}

export async function beginOpeningStockRecord(actor: CurrentActor | null | undefined, input: { attemptId: string; revision: number }): Promise<OpeningStockResult<{ revision: number }>> {
  return runOpeningStock(async (database) => {
    const setup = await claim(database);
    await authorizeOpeningStock(database, actor, true);
    if (setup.status === "draft" && setup.attemptId === input.attemptId) return { revision: setup.revision };
    if (setup.status !== "not-started" || setup.revision !== input.revision || await database.openingStockDiscard.findUnique({ where: { attemptId: input.attemptId } })) rejectOpeningStock("conflict", "Opening Stock setup changed. Reopen the current count before continuing.");
    if (await database.inventoryLedgerMovement.findFirst({ select: { id: true } })) rejectOpeningStock("history", "Existing posted stock history prevents an opening balance. Use a clean operational start; existing records have not been changed.");
    const updated = await database.openingStockSetup.update({ where: { id: OPENING_STOCK_ID }, data: { status: "draft", attemptId: input.attemptId, revision: { increment: 1 }, countDate: openingStockToday() } });
    return { revision: updated.revision };
  });
}

export async function saveOpeningStockRecord(actor: CurrentActor | null | undefined, input: OpeningStockSaveInput): Promise<OpeningStockResult<{ revision: number }>> {
  return runOpeningStock(async (database) => {
    const setup = await claim(database);
    await authorizeOpeningStock(database, actor, true);
    if (setup.status !== "draft" || setup.attemptId !== input.attemptId || setup.revision !== input.revision) rejectOpeningStock("conflict", "This draft changed or was discarded. Reopen Opening Stock and review before saving.");
    const lines = [];
    for (const [position, line] of input.lines.entries()) {
      const item = await database.item.findFirst({ where: { id: line.itemId, isActive: true }, include: { baseUnit: true, unitConversions: { include: { alternateUnit: true } } } });
      if (!item || !item.baseUnit.active) rejectOpeningStock("reference", `Line ${position + 1}: select an active Item and Base Unit.`);
      const conversion = line.conversionId ? item.unitConversions.find((entry) => entry.id === line.conversionId && entry.alternateUnitId === line.selectedUnitId && entry.alternateUnit.active) : null;
      const base = line.selectedUnitId === item.baseUnitId && line.conversionId === null;
      if (!base && !conversion) rejectOpeningStock("reference", `${item.name}: the selected unit is unavailable. Select it again and review the conversion.`);
      const previous = setup.lines.find((entry) => entry.id === line.id);
      if (previous && previous.itemId !== line.itemId) rejectOpeningStock("reference", "A saved count line cannot change its Item. Remove it and add the intended Item.");
      if (previous && previous.baseUnitId !== item.baseUnitId) rejectOpeningStock("reference", `${item.name}: its Base Unit changed. Remove and reselect the Item.`);
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
  return runOpeningStock(async (database) => {
    const setup = await claim(database);
    const user = await authorizeOpeningStock(database, actor, true);
    const prior = await database.openingStockDiscard.findUnique({ where: { attemptId: input.attemptId } });
    if (prior) return { revision: prior.resultingRevision, discardedAttemptId: prior.attemptId };
    if (setup.status !== "draft" || setup.attemptId !== input.attemptId || setup.revision !== input.revision) rejectOpeningStock("conflict", "The setup changed. Reopen it before discarding this draft.");
    await database.openingStockLine.deleteMany({ where: { openingStockId: OPENING_STOCK_ID } });
    const updated = await database.openingStockSetup.update({ where: { id: OPENING_STOCK_ID }, data: { status: "not-started", attemptId: null, countDate: "", note: "", revision: { increment: 1 } } });
    await database.openingStockDiscard.create({ data: { attemptId: input.attemptId, openingStockId: OPENING_STOCK_ID, resultingRevision: updated.revision, actorId: user.id, actorName: user.name } });
    return { revision: updated.revision, discardedAttemptId: input.attemptId };
  });
}
