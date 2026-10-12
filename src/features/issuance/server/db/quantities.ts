import "server-only";
import type { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";
import type { IssuanceReviewReference } from "../../types";
import { addRational, decimalRational, finiteDecimal, rational } from "../../domain/rational";

export async function getIssuanceReviewReferences(itemIds: string[], database: Pick<Prisma.TransactionClient, "item" | "inventoryLedgerMovement"> = prisma): Promise<IssuanceReviewReference[]> {
  if (!itemIds.length) return [];
  const where = { itemId: { in: [...new Set(itemIds)] } };
  const items = await database.item.findMany({ where: { id: where.itemId }, select: { id: true, issuanceQuantityPolicy: true } });
  const movements = await database.inventoryLedgerMovement.findMany({ where, select: { itemId: true, quantity: true, movementType: true } });
  const balances = new Map<string, ReturnType<typeof rational>>();
  for (const movement of movements) {
    const quantity = decimalRational(movement.quantity);
    if (movement.movementType !== "stock-in" && movement.movementType !== "stock-out") throw new Error("Unknown inventory ledger movement direction.");
    const signed = movement.movementType === "stock-out" ? rational(-quantity.numerator, quantity.denominator) : quantity;
    balances.set(movement.itemId, addRational(balances.get(movement.itemId) ?? rational(BigInt(0)), signed));
  }
  return items.map((item) => ({ itemId: item.id, policy: item.issuanceQuantityPolicy === "whole-only" ? "whole-only" : "allow-decimals", availableQuantity: finiteDecimal(balances.get(item.id) ?? rational(BigInt(0)))! }));
}
