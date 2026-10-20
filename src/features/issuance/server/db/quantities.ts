import "server-only";
import type { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";
import type { IssuanceReviewReference } from "../../types";
import { readStockBalances } from "@/features/supply-operations/server/db/stock-balances";
import { InvalidStockEvidenceError } from "@/features/supply-operations/domain/inventory";

export async function getIssuanceReviewReferences(itemIds: string[], database: Pick<Prisma.TransactionClient, "item" | "inventoryLedgerMovement"> = prisma): Promise<IssuanceReviewReference[]> {
  if (!itemIds.length) return [];
  const ids = [...new Set(itemIds)];
  const items = await database.item.findMany({ where: { id: { in: ids } }, select: { id: true, issuanceQuantityPolicy: true } });
  const balances = await readStockBalances(ids, database);
  return items.map((item) => {
    const balance = balances.get(item.id)!;
    if (balance.kind === "invalid") throw new InvalidStockEvidenceError(balance.error);
    return { itemId: item.id, policy: item.issuanceQuantityPolicy === "whole-only" ? "whole-only" : "allow-decimals", availableQuantity: balance.quantity };
  });
}
