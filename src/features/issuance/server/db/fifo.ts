import "server-only";
import type { Prisma } from "@/prisma/generated/client";
import type { IssuanceReceiptAllocation } from "../../types";
import { allocateFifo } from "../../domain/fifo";
import { addRational, compareRational, decimalRational, finiteDecimal, rational } from "../../domain/rational";
import { readOpeningStockSourceCapacity, withdrawOpeningStockSource } from "@/features/supply-operations/server/db/opening-stock-sources";

export class FifoAllocationError extends Error {}
const subtract = (a: string, b: string) => {
  const right = decimalRational(b);
  const remaining = addRational(decimalRational(a), rational(-right.numerator, right.denominator));
  if (remaining.numerator < BigInt(0)) throw new FifoAllocationError("Receipt allocations exceed received stock. Review the inventory history before posting.");
  return finiteDecimal(remaining)!;
};

/** Caller must hold the posting writer lock. Allocation and ledger writes share its transaction. */
export async function allocatePostedItemReceipts(database: Prisma.TransactionClient, totalId: string, itemId: string, baseUnitId: string, quantity: string): Promise<IssuanceReceiptAllocation[]> {
  const incoming = await database.inventoryLedgerMovement.findMany({ where: { itemId, baseUnitId, movementType: "stock-in", openingStockSourceId: null }, include: { deliveryReceiptLine: { include: { deliveryReceipt: true, issuanceAllocations: true } } } });
  const layers = incoming.map((movement) => {
    const line = movement.deliveryReceiptLine;
    if (!line || line.itemId !== itemId || line.baseUnitId !== baseUnitId) throw new FifoAllocationError("Receipt stock does not match its Item and Base Unit. Review the inventory history before posting.");
    let remaining = movement.quantity;
    for (const allocation of line.issuanceAllocations) remaining = subtract(remaining, allocation.quantity);
    return { id: line.id, quantity: remaining, receiptId: line.deliveryReceiptId, receiptDate: line.deliveryReceipt.receiptDate.toISOString(), postedAt: line.deliveryReceipt.postedAt.toISOString(), receiptNo: line.deliveryReceipt.receiptNo, purchaseOrderNo: line.deliveryReceipt.purchaseOrderNo };
  });
  const byId = new Map(layers.map((layer) => [layer.id, layer]));
  async function consume(issuanceItemTotalId: string, required: string, basis: IssuanceReceiptAllocation["basis"]) {
    const selected = allocateFifo(layers, required);
    if (!selected) throw new FifoAllocationError("Available receipt quantities do not cover this issuance. Review the inventory history before posting.");
    const allocations = selected.map((entry) => {
      const layer = byId.get(entry.receiptLineId)!;
      layer.quantity = subtract(layer.quantity, entry.quantity);
      return { receiptLineId: entry.receiptLineId, quantity: entry.quantity, receiptNo: layer.receiptNo, purchaseOrderNo: layer.purchaseOrderNo, receiptDate: layer.receiptDate, basis };
    });
    await database.issuanceReceiptAllocation.createMany({ data: allocations.map(({ receiptLineId, ...allocation }) => ({ ...allocation, id: crypto.randomUUID(), issuanceItemTotalId, deliveryReceiptLineId: receiptLineId })) });
    return allocations;
  }
  // Existing postings have no recorded receipt source. Reconstruct once, with an
  // explicit basis, without changing any old movement or original posting evidence.
  const outgoing = await database.inventoryLedgerMovement.findMany({ where: { itemId, baseUnitId, movementType: "stock-out" }, include: { issuanceItemTotal: { include: { receiptAllocations: true, openingWithdrawals: true } } }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] });
  for (const movement of outgoing) {
    const total = movement.issuanceItemTotal;
    if (!total) throw new FifoAllocationError("A stock-out has no issuance source. Review the inventory history before posting.");
    if (!total.receiptAllocations.length && !total.openingWithdrawals.length) await consume(total.id, movement.quantity, "reconstructed");
    else {
      const allocated = [...total.receiptAllocations, ...total.openingWithdrawals].reduce((sum, entry) => addRational(sum, decimalRational(entry.quantity)), rational(BigInt(0)));
      if (compareRational(allocated, decimalRational(movement.quantity)) !== 0) throw new FifoAllocationError("An existing issuance has incomplete receipt allocations. Review the inventory history before posting.");
    }
  }
  return decimalRational(quantity).numerator === BigInt(0) ? [] : consume(totalId, quantity, "fifo");
}

/** Keep receipt reconstruction receipt-only; new issuance consumes opening sources first. */
export async function allocatePostedItemSources(database: Prisma.TransactionClient, totalId: string, itemId: string, baseUnitId: string, quantity: string, postedAt: Date) {
  let needed = decimalRational(quantity);
  const openingAllocations = [];
  const sources = await database.openingStockSource.findMany({ where: { itemId, baseUnitId, postedAt: { lte: postedAt } }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true } });
  for (const source of sources) {
    if (needed.numerator === BigInt(0)) break;
    const state = await readOpeningStockSourceCapacity(database, source.id);
    const available = decimalRational(state.remaining);
    const taken = compareRational(available, needed) < 0 ? available : needed;
    if (taken.numerator === BigInt(0)) continue;
    openingAllocations.push(await withdrawOpeningStockSource(database, source.id, { issuanceItemTotalId: totalId, quantity: finiteDecimal(taken)!, postedAt }));
    needed = addRational(needed, rational(-taken.numerator, taken.denominator));
  }
  const receiptAllocations = await allocatePostedItemReceipts(database, totalId, itemId, baseUnitId, finiteDecimal(needed)!);
  return { receiptAllocations, openingAllocations };
}
