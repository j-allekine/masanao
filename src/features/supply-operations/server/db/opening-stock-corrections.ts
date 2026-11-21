import "server-only";
import type { Prisma } from "@/prisma/generated/client";
import type { CurrentActor } from "@/server/auth";
import type { OpeningStockCorrectionSaveInput, OpeningStockCorrection, OpeningStockSourceSummary } from "../../opening-stock-correction-types";
import { OPENING_STOCK_ID, authorizeOpeningStock, rejectOpeningStock as reject, runOpeningStock } from "./opening-stock";
import { readOpeningStockSourceCapacity, withdrawOpeningStockSource } from "./opening-stock-sources";
import { openingStockProduct } from "../../domain/opening-stock";
import { allocatedSupplyCost } from "../../domain/budget-variance";
import { addRational, compareRational, decimalRational, finiteDecimal, rational } from "@/features/issuance/domain/rational";

async function claim(database: Prisma.TransactionClient) {
  const setup = await database.openingStockSetup.upsert({ where: { id: OPENING_STOCK_ID }, create: { id: OPENING_STOCK_ID }, update: { revision: { increment: 0 } } });
  if (setup.status !== "posted") reject("conflict", "Post Opening Stock before recording a correction.");
  return setup;
}
async function currentContext(database: Prisma.TransactionClient, itemId: string) {
  const sources = await database.openingStockSource.findMany({ where: { itemId }, orderBy: [{ position: "asc" }, { id: "asc" }] });
  let quantity = "0"; let value = BigInt(0);
  for (const source of sources) {
    const state = await readOpeningStockSourceCapacity(database, source.id);
    quantity = finiteDecimal(addRational(decimalRational(quantity), decimalRational(state.remaining)))!;
    if (decimalRational(state.remaining).numerator > BigInt(0)) value += BigInt(allocatedSupplyCost(source.amount, source.quantity, state.before, state.remaining)!);
  }
  return { beforeQuantity: quantity, beforeValueCentavos: value.toString(), sourceState: JSON.stringify(sources.map(source => [source.id, source.revision])) };
}
export async function readOpeningStockCorrectionHistory(database: Prisma.TransactionClient, canManage: boolean) {
  const records = await database.openingStockCorrection.findMany({ where: { openingStockId: OPENING_STOCK_ID, discardedAt: null, ...(canManage ? {} : { status: "posted" }) }, include: { lines: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "asc" } });
  const corrections: OpeningStockCorrection[] = records.map(record => ({ ...record, kind: record.kind as OpeningStockCorrection["kind"], status: record.status as "draft" | "posted", postedAt: record.postedAt?.toISOString() ?? null }));
  const sources: OpeningStockSourceSummary[] = [];
  for (const source of await database.openingStockSource.findMany({ where: { openingStockId: OPENING_STOCK_ID }, include: { correctionLine: true }, orderBy: { position: "asc" } })) {
    const state = await readOpeningStockSourceCapacity(database, source.id);
    const remainingValueCentavos = decimalRational(state.remaining).numerator === BigInt(0) ? "0" : allocatedSupplyCost(source.amount, source.quantity, state.before, state.remaining)!;
    sources.push({ id: source.id, itemId: source.itemId, itemName: source.itemName, reference: source.reference, position: source.position, quantity: source.quantity, remainingQuantity: state.remaining, remainingValueCentavos, baseUnitAbbreviation: source.baseUnitAbbreviation, correctionId: source.correctionLine?.correctionId ?? null });
  }
  return { corrections, sources };
}
async function readCorrection(database: Prisma.TransactionClient, id: string): Promise<OpeningStockCorrection> {
  const record = await database.openingStockCorrection.findUniqueOrThrow({ where: { id }, include: { lines: { orderBy: { position: "asc" } } } });
  return { ...record, kind: record.kind as OpeningStockCorrection["kind"], status: record.status as "draft" | "posted", postedAt: record.postedAt?.toISOString() ?? null };
}
async function editable(database: Prisma.TransactionClient, input: { id: string; revision: number }) {
  const record = await database.openingStockCorrection.findUnique({ where: { id: input.id }, include: { lines: { orderBy: { position: "asc" } } } });
  if (!record || record.discardedAt || record.status !== "draft" || record.revision !== input.revision) reject("conflict", "The correction changed or was discarded. Reopen it and review before continuing.");
  return record;
}
export async function beginOpeningStockCorrectionRecord(actor: CurrentActor | null | undefined, input: { id: string; kind?: "add-omitted" | "reduce-remaining" }) {
  return runOpeningStock(async database => {
    const setup = await claim(database); const user = await authorizeOpeningStock(database, actor, true);
    const prior = await database.openingStockCorrection.findUnique({ where: { id: input.id } });
    if (prior && !prior.discardedAt && prior.status === "draft") return { revision: prior.revision, correction: await readCorrection(database, prior.id) };
    if (prior) reject("conflict", "This correction was posted or discarded. Record another correction.");
    const count = await database.openingStockCorrection.count({ where: { openingStockId: setup.id } });
    await database.openingStockCorrection.create({ data: { id: input.id, openingStockId: setup.id, reference: `${setup.reference}-C${String(count + 1).padStart(4, "0")}`, kind: input.kind ?? "add-omitted", createdById: user.id, createdByName: user.name } });
    return { revision: 0, correction: await readCorrection(database, input.id) };
  });
}
export async function saveOpeningStockCorrectionRecord(actor: CurrentActor | null | undefined, input: OpeningStockCorrectionSaveInput) {
  return runOpeningStock(async database => {
    await claim(database); await authorizeOpeningStock(database, actor, true);
    const record = await editable(database, input);
    if (record.kind === "reduce-remaining") return saveReductions(database, record, input);
    const lines = [];
    const contexts = new Map<string, Awaited<ReturnType<typeof currentContext>>>();
    for (const [position, line] of input.lines.entries()) {
      if ("sourceId" in line) reject("validation", "Select an Item for omitted stock.");
      const owner = await database.openingStockCorrectionLine.findUnique({ where: { id: line.id }, select: { correctionId: true } });
      if (owner && owner.correctionId !== record.id) reject("reference", "A correction line belongs to another record. Add the Item again.");
      const item = await database.item.findFirst({ where: { id: line.itemId, isActive: true }, include: { baseUnit: true, unitConversions: { include: { alternateUnit: true } } } });
      if (!item?.baseUnit.active) reject("reference", `Line ${position + 1}: select an active Item and Base Unit.`);
      const conversion = line.conversionId ? item.unitConversions.find(c => c.id === line.conversionId && c.alternateUnitId === line.selectedUnitId && c.alternateUnit.active) : null;
      if (!(line.conversionId === null && line.selectedUnitId === item.baseUnitId) && !conversion) reject("reference", `${item.name}: select an available unit again.`);
      const previous = record.lines.find(entry => entry.id === line.id);
      if (previous && (previous.itemId !== item.id || previous.baseUnitId !== item.baseUnitId)) reject("reference", "Item or Base Unit changed. Remove and reselect the line.");
      const unchanged = previous && previous.selectedUnitId === line.selectedUnitId && previous.conversionId === line.conversionId;
      const unit = conversion?.alternateUnit ?? item.baseUnit;
      const conversionFactor = unchanged ? previous.conversionFactor : conversion?.baseUnitQuantity ?? "1";
      const calculatedBaseUnitQuantity = openingStockProduct(line.quantity, conversionFactor);
      const lineAmount = line.openingUnitCost === "" ? null : openingStockProduct(line.quantity, line.openingUnitCost);
      const context = contexts.get(item.id) ?? await currentContext(database, item.id);
      const addedCentavos = lineAmount !== null && calculatedBaseUnitQuantity && decimalRational(calculatedBaseUnitQuantity).numerator > BigInt(0) ? allocatedSupplyCost(lineAmount, calculatedBaseUnitQuantity, "0", calculatedBaseUnitQuantity) : null;
      lines.push({ ...line, correctionId: record.id, position, itemName: unchanged ? previous.itemName : item.name, selectedUnitName: unchanged ? previous.selectedUnitName : unit.name, selectedUnitAbbreviation: unchanged ? previous.selectedUnitAbbreviation : unit.abbreviation, baseUnitId: item.baseUnitId, baseUnitName: unchanged ? previous.baseUnitName : item.baseUnit.name, baseUnitAbbreviation: unchanged ? previous.baseUnitAbbreviation : item.baseUnit.abbreviation, conversionFactor, calculatedBaseUnitQuantity, lineAmount, ...context, afterQuantity: calculatedBaseUnitQuantity ? finiteDecimal(addRational(decimalRational(context.beforeQuantity), decimalRational(calculatedBaseUnitQuantity))) : null, afterValueCentavos: addedCentavos === null ? null : (BigInt(context.beforeValueCentavos) + BigInt(addedCentavos)).toString() });
    // A later same-Item line starts after earlier additions in this correction.
      const priorLine = lines.at(-1);
      if (priorLine && priorLine.afterQuantity !== null && priorLine.afterValueCentavos !== null) contexts.set(priorLine.itemId, { beforeQuantity: priorLine.afterQuantity!, beforeValueCentavos: priorLine.afterValueCentavos!, sourceState: priorLine.sourceState });
    }
    await database.openingStockCorrectionLine.deleteMany({ where: { correctionId: record.id, id: { notIn: lines.map(l => l.id) } } });
    for (const line of lines) { const { id, ...data } = line; await database.openingStockCorrectionLine.upsert({ where: { id }, create: line, update: data }); }
    const saved = await database.openingStockCorrection.update({ where: { id: record.id }, data: { reason: input.reason, note: input.note, revision: { increment: 1 } } });
    return { revision: saved.revision, correction: await readCorrection(database, saved.id) };
  });
}
export async function postOpeningStockCorrectionRecord(actor: CurrentActor | null | undefined, input: { id: string; revision: number; zeroCostAcknowledged: boolean }, hooks: { afterFirstMovement?: () => void } = {}) {
  return runOpeningStock(async database => {
    const setup = await claim(database); const user = await authorizeOpeningStock(database, actor, true);
    const prior = await database.openingStockCorrection.findUnique({ where: { id: input.id } });
    if (prior?.status === "posted" && !prior.discardedAt) return { revision: prior.revision };
    const record = await editable(database, input);
    if (record.kind === "reduce-remaining") return postReductions(database, record, user, hooks);
    if (!record.reason.trim() || !record.lines.length) reject("validation", "Enter a correction reason and at least one omitted stock line.", { reason: "Explain why the starting stock was omitted." });
    const postedAt = new Date();
    let position = (await database.openingStockSource.aggregate({ where: { openingStockId: setup.id }, _max: { position: true } }))._max.position ?? -1;
    // Validate all reviewed contexts before creating sources; sibling additions share the same before snapshot.
    for (const line of record.lines) {
      const current = await currentContext(database, line.itemId);
      if (current.sourceState !== line.sourceState) reject("conflict", `${line.itemName}: remaining opening stock changed. Save and review the correction again.`);
    }
    for (const [index, line] of record.lines.entries()) {
      const fields: Record<string, string> = {};
      let positiveQuantity = false; let nonnegativeCost = false;
      try { positiveQuantity = decimalRational(line.quantity).numerator > BigInt(0); } catch {}
      try { nonnegativeCost = line.openingUnitCost !== "" && decimalRational(line.openingUnitCost).numerator >= BigInt(0); } catch {}
      if (!positiveQuantity) fields[`lines.${index}.quantity`] = "Enter a positive quantity.";
      if (!nonnegativeCost) fields[`lines.${index}.openingUnitCost`] = "Enter an explicit cost of zero or more.";
      else if (decimalRational(line.openingUnitCost).numerator === BigInt(0)) {
        if (!line.zeroCostReason.trim()) fields[`lines.${index}.zeroCostReason`] = "Explain the assigned zero cost.";
        if (!input.zeroCostAcknowledged) fields.zeroCostAcknowledged = "Acknowledge zero-cost lines in review.";
      }
      if (Object.keys(fields).length) reject("validation", "Complete the correction fields before posting.", fields);
      const item = await database.item.findFirst({ where: { id: line.itemId, isActive: true }, include: { baseUnit: true } });
      const unit = await database.unit.findFirst({ where: { id: line.selectedUnitId, active: true } });
      const conversion = line.conversionId ? await database.itemUnitConversion.findFirst({ where: { id: line.conversionId, itemId: line.itemId, alternateUnitId: line.selectedUnitId } }) : null;
      if (!item?.baseUnit.active || !unit || item.baseUnitId !== line.baseUnitId || (line.conversionId ? !conversion || compareRational(decimalRational(conversion.baseUnitQuantity), decimalRational(line.conversionFactor)) !== 0 : line.selectedUnitId !== item.baseUnitId || line.conversionFactor !== "1")) reject("reference", `${line.itemName}: Item or conversion changed. Remove and reselect the line, then review.`);
      const quantity = openingStockProduct(line.quantity, line.conversionFactor); const amount = openingStockProduct(line.quantity, line.openingUnitCost);
      if (!quantity || amount === null || quantity !== line.calculatedBaseUnitQuantity || amount !== line.lineAmount) reject("reference", "Correction quantity or value evidence is incomplete. Save and review again.");
      await database.openingStockCorrectionLine.update({ where: { id: line.id }, data: { itemName: item.name, selectedUnitName: unit.name, selectedUnitAbbreviation: unit.abbreviation, baseUnitName: item.baseUnit.name, baseUnitAbbreviation: item.baseUnit.abbreviation } });
      const source = await database.openingStockSource.create({ data: { id: crypto.randomUUID(), openingStockId: setup.id, correctionLineId: line.id, itemId: item.id, baseUnitId: item.baseUnitId, itemName: item.name, baseUnitName: item.baseUnit.name, baseUnitAbbreviation: item.baseUnit.abbreviation, reference: record.reference, countDate: setup.countDate, position: ++position, quantity, amount, postedAt } });
      await database.inventoryLedgerMovement.create({ data: { id: crypto.randomUUID(), openingStockSourceId: source.id, itemId: item.id, baseUnitId: item.baseUnitId, quantity, movementType: "stock-in", occurredAt: postedAt } });
      if (index === 0) hooks.afterFirstMovement?.();
    }
    const posted = await database.openingStockCorrection.update({ where: { id: record.id }, data: { status: "posted", postedAt, postedById: user.id, postedByName: user.name, revision: { increment: 1 } } });
    return { revision: posted.revision };
  });
}
export async function discardOpeningStockCorrectionRecord(actor: CurrentActor | null | undefined, input: { id: string; revision: number }) {
  return runOpeningStock(async database => {
    await claim(database); const user = await authorizeOpeningStock(database, actor, true);
    const prior = await database.openingStockCorrection.findUnique({ where: { id: input.id } });
    if (prior?.discardedAt) return { revision: prior.revision };
    const record = await editable(database, input);
    await database.openingStockCorrectionLine.deleteMany({ where: { correctionId: record.id } });
    const discarded = await database.openingStockCorrection.update({ where: { id: record.id }, data: { discardedAt: new Date(), discardedById: user.id, revision: { increment: 1 } } });
    return { revision: discarded.revision };
  });
}


type CorrectionRecord = Prisma.OpeningStockCorrectionGetPayload<{ include: { lines: true } }>;
const difference = (left: string, right: string) => {
  const value = decimalRational(right);
  return finiteDecimal(addRational(decimalRational(left), rational(-value.numerator, value.denominator)))!;
};
async function saveReductions(database: Prisma.TransactionClient, record: CorrectionRecord, input: OpeningStockCorrectionSaveInput) {
  const lines = [];
  const selected = new Set<string>();
  for (const [position, line] of input.lines.entries()) {
    if (!("sourceId" in line)) reject("validation", "Select an opening source for the reduction.");
    if (selected.has(line.sourceId)) reject("validation", "Select each opening source once and combine its reduction quantity.");
    selected.add(line.sourceId);
    const owner = await database.openingStockCorrectionLine.findUnique({ where: { id: line.id }, select: { correctionId: true } });
    if (owner && owner.correctionId !== record.id) reject("reference", "A correction line belongs to another record. Select the source again.");
    const state = await readOpeningStockSourceCapacity(database, line.sourceId);
    const source = state.source;
    if (source.openingStockId !== record.openingStockId) reject("reference", "Select a source from this Opening Stock record.");
    if (line.quantity && compareRational(decimalRational(line.quantity), decimalRational(state.remaining)) > 0) reject("validation", `${source.itemName}: reduction exceeds this source's remaining quantity.`, { [`lines.${position}.quantity`]: `At most ${state.remaining} ${source.baseUnitAbbreviation} remains in this source.` });
    const residual = decimalRational(state.remaining).numerator === BigInt(0) ? "0" : allocatedSupplyCost(source.amount, source.quantity, state.before, state.remaining)!;
    const cost = line.quantity ? allocatedSupplyCost(source.amount, source.quantity, state.before, line.quantity) : null;
    lines.push({ id: line.id, correctionId: record.id, position, sourceId: source.id, sourceReference: source.reference, sourcePosition: source.position, itemId: source.itemId, itemName: source.itemName, selectedUnitId: source.baseUnitId, selectedUnitName: source.baseUnitName, selectedUnitAbbreviation: source.baseUnitAbbreviation, baseUnitId: source.baseUnitId, baseUnitName: source.baseUnitName, baseUnitAbbreviation: source.baseUnitAbbreviation, conversionId: null, conversionFactor: "1", quantity: line.quantity, openingUnitCost: "", zeroCostReason: "", calculatedBaseUnitQuantity: line.quantity || null, lineAmount: cost === null ? null : finiteDecimal(rational(BigInt(cost), BigInt(100))), beforeQuantity: state.remaining, beforeValueCentavos: residual, afterQuantity: line.quantity ? difference(state.remaining, line.quantity) : null, afterValueCentavos: cost === null ? null : (BigInt(residual) - BigInt(cost)).toString(), sourceState: JSON.stringify([[source.id, source.revision]]) });
  }
  await database.openingStockCorrectionLine.deleteMany({ where: { correctionId: record.id, id: { notIn: lines.map(line => line.id) } } });
  for (const line of lines) { const { id, ...data } = line; await database.openingStockCorrectionLine.upsert({ where: { id }, create: line, update: data }); }
  const saved = await database.openingStockCorrection.update({ where: { id: record.id }, data: { reason: input.reason, note: input.note, revision: { increment: 1 } } });
  return { revision: saved.revision, correction: await readCorrection(database, saved.id) };
}
async function postReductions(database: Prisma.TransactionClient, record: CorrectionRecord, user: { id: string; name: string }, hooks: { afterFirstMovement?: () => void }) {
  if (!record.reason.trim() || !record.lines.length) reject("validation", "Enter a correction reason and at least one source reduction.", { reason: "Explain why the remaining starting stock needs to be reduced." });
  const postedAt = new Date();
  for (const [index, line] of record.lines.entries()) {
    if (!line.sourceId || !line.quantity || decimalRational(line.quantity).numerator <= BigInt(0)) reject("validation", "Complete the reduction fields before posting.", { [`lines.${index}.quantity`]: "Enter a positive reduction quantity." });
    const state = await readOpeningStockSourceCapacity(database, line.sourceId);
    const source = state.source;
    if (line.sourceState !== JSON.stringify([[source.id, source.revision]])) reject("conflict", `${line.itemName}: remaining opening stock changed. Save and review the correction again.`);
    if (source.openingStockId !== record.openingStockId || source.itemId !== line.itemId || source.baseUnitId !== line.baseUnitId || source.postedAt > postedAt) reject("reference", "The selected source no longer matches the correction. Select it again and review.");
    if (compareRational(decimalRational(line.quantity), decimalRational(state.remaining)) > 0) reject("validation", `${line.itemName}: reduction exceeds this source's remaining quantity.`);
    const cost = allocatedSupplyCost(source.amount, source.quantity, state.before, line.quantity);
    const residual = allocatedSupplyCost(source.amount, source.quantity, state.before, state.remaining);
    if (cost === null || residual === null || line.beforeQuantity !== state.remaining || line.beforeValueCentavos !== residual || line.afterQuantity !== difference(state.remaining, line.quantity) || line.afterValueCentavos !== (BigInt(residual) - BigInt(cost)).toString()) reject("conflict", "Remaining quantity or value changed. Save and review the correction again.");
    await withdrawOpeningStockSource(database, source.id, { correctionLineId: line.id, quantity: line.quantity, postedAt });
    await database.inventoryLedgerMovement.create({ data: { id: crypto.randomUUID(), openingStockCorrectionLineId: line.id, itemId: source.itemId, baseUnitId: source.baseUnitId, quantity: line.quantity, movementType: "stock-out", occurredAt: postedAt } });
    if (index === 0) hooks.afterFirstMovement?.();
  }
  const posted = await database.openingStockCorrection.update({ where: { id: record.id }, data: { status: "posted", postedAt, postedById: user.id, postedByName: user.name, revision: { increment: 1 } } });
  return { revision: posted.revision };
}
