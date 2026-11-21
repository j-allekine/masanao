import "server-only";
import type { Prisma } from "@/prisma/generated/client";
import { addRational, compareRational, decimalRational, finiteDecimal, rational } from "@/features/issuance/domain/rational";
import { allocatedSupplyCost } from "../../domain/budget-variance";

export class OpeningStockSourceError extends Error {}
const invalid = () => new OpeningStockSourceError("Opening Stock source evidence is inconsistent. Review the recorded stock before posting.");

/** All source consumption, including later correction retirement, shares this basis. */
export async function readOpeningStockSourceCapacity(database: Prisma.TransactionClient, sourceId: string) {
  const source = await database.openingStockSource.findUnique({ where: { id: sourceId }, include: { movement: true, withdrawals: { orderBy: { sequence: "asc" }, include: { correctionLine: { include: { movement: true, correction: true } } } } } });
  if (!source) throw invalid();
  try {
    const quantity = decimalRational(source.quantity);
    if (quantity.numerator <= BigInt(0) || decimalRational(source.amount).numerator < BigInt(0)) throw invalid();
    const movement = source.movement;
    if (!movement || movement.itemId !== source.itemId || movement.baseUnitId !== source.baseUnitId || movement.movementType !== "stock-in" || compareRational(decimalRational(movement.quantity), quantity) !== 0) throw invalid();
    let before = "0";
    let sequence = 0;
    for (const withdrawal of source.withdrawals) {
      const used = decimalRational(withdrawal.quantity);
      const after = finiteDecimal(addRational(decimalRational(before), used));
      const cost = allocatedSupplyCost(source.amount, source.quantity, before, withdrawal.quantity);
      if (withdrawal.sequence !== sequence + 1 || withdrawal.beforeQuantity !== before || withdrawal.afterQuantity !== after || withdrawal.costCentavos !== cost || used.numerator <= BigInt(0)) throw invalid();
      if (withdrawal.kind === "correction-retirement") {
        const line = withdrawal.correctionLine;
        const retirement = line?.movement;
        if (withdrawal.issuanceItemTotalId !== null || !line || line.sourceId !== source.id || line.correction.status !== "posted" || line.correction.openingStockId !== source.openingStockId || !retirement || retirement.movementType !== "stock-out" || retirement.itemId !== source.itemId || retirement.baseUnitId !== source.baseUnitId || compareRational(decimalRational(retirement.quantity), used) !== 0) throw invalid();
      } else if (withdrawal.kind !== "issuance" || !withdrawal.issuanceItemTotalId || withdrawal.correctionLineId !== null) throw invalid();
      sequence = withdrawal.sequence; before = withdrawal.afterQuantity;
    }
    const consumed = decimalRational(before);
    const remaining = addRational(quantity, rational(-consumed.numerator, consumed.denominator));
    if (remaining.numerator < BigInt(0)) throw invalid();
    return { source, remaining: finiteDecimal(remaining)!, before, sequence };
  } catch (error) {
    if (error instanceof OpeningStockSourceError) throw error;
    throw invalid();
  }
}

/** Caller owns the SQLite writer lock and commits allocations with the stock-out. */
export async function withdrawOpeningStockSource(database: Prisma.TransactionClient, sourceId: string, input: ({ issuanceItemTotalId: string; correctionLineId?: never } | { correctionLineId: string; issuanceItemTotalId?: never }) & { quantity: string; postedAt: Date }) {
  const state = await readOpeningStockSourceCapacity(database, sourceId);
  const cost = allocatedSupplyCost(state.source.amount, state.source.quantity, state.before, input.quantity);
  if (cost === null || compareRational(decimalRational(input.quantity), decimalRational(state.remaining)) > 0 || state.source.postedAt > input.postedAt) throw invalid();
  const after = finiteDecimal(addRational(decimalRational(state.before), decimalRational(input.quantity)))!;
  const withdrawal = await database.openingStockWithdrawal.create({ data: { id: crypto.randomUUID(), sourceId, issuanceItemTotalId: input.issuanceItemTotalId ?? null, correctionLineId: input.correctionLineId ?? null, kind: input.correctionLineId ? "correction-retirement" : "issuance", sequence: state.sequence + 1, quantity: input.quantity, beforeQuantity: state.before, afterQuantity: after, costCentavos: cost, postedAt: input.postedAt } });
  await database.openingStockSource.update({ where: { id: sourceId }, data: { revision: { increment: 1 } } });
  return { sourceId, linePosition: state.source.position, quantity: withdrawal.quantity, reference: state.source.reference, countDate: state.source.countDate, costCentavos: withdrawal.costCentavos, sequence: withdrawal.sequence };
}
