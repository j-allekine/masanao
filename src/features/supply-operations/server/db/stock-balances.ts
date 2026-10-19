import "server-only";
import type { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";
import { addRational, decimalRational, finiteDecimal, rational } from "@/features/issuance/domain/rational";
import type { StockBalance } from "../../domain/inventory";

/** Ledger stock-outs already account for issued quantities; allocations are source evidence only. */
export async function readStockBalances(
  itemIds: string[],
  database: Pick<Prisma.TransactionClient, "inventoryLedgerMovement"> = prisma,
): Promise<Map<string, StockBalance>> {
  const ids = [...new Set(itemIds)];
  const totals = new Map(ids.map((id) => [id, rational(BigInt(0))]));
  const invalid = new Set<string>();
  if (ids.length) {
    const movements = await database.inventoryLedgerMovement.findMany({
      where: { itemId: { in: ids } },
      select: { itemId: true, quantity: true, movementType: true },
    });
    for (const movement of movements) {
      try {
        const quantity = decimalRational(movement.quantity);
        if (movement.movementType !== "stock-in" && movement.movementType !== "stock-out") throw new Error("Invalid movement direction");
        const signed = movement.movementType === "stock-out" ? rational(-quantity.numerator, quantity.denominator) : quantity;
        totals.set(movement.itemId, addRational(totals.get(movement.itemId)!, signed));
      } catch {
        invalid.add(movement.itemId);
      }
    }
  }
  return new Map(ids.map((id) => {
    const total = totals.get(id)!;
    const balance: StockBalance = invalid.has(id)
      ? { kind: "invalid", error: "Invalid stock evidence. Review the recorded movements." }
      : total.numerator < BigInt(0)
        ? { kind: "invalid", error: "Negative stock balance. Review the recorded movements." }
        : { kind: "valid", quantity: finiteDecimal(total)! };
    return [id, balance];
  }));
}
