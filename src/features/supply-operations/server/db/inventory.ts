import "server-only";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";
import { inventoryStockStatus } from "../../domain/inventory";
import type { InventoryListItem, InventoryResult } from "../../types";
import { readStockBalances } from "./stock-balances";

export async function listInventoryRecords(actor: CurrentActor | null | undefined): Promise<InventoryResult> {
  if (!actor) return { ok: false, kind: "forbidden", error: "Staff access required." };
  return prisma.$transaction(async (transaction) => {
    const authorized = await transaction.user.findFirst({
      where: { id: actor.id, disabled: false, role: { in: ["staff", "admin"] } },
      select: { id: true },
    });
    if (!authorized) return { ok: false, kind: "forbidden", error: "Staff access required." };
    const items = await transaction.item.findMany({
      where: { isActive: true },
      select: { id: true, name: true, reorderLevel: true, category: { select: { id: true, name: true } }, baseUnit: { select: { id: true, name: true, abbreviation: true } } },
      orderBy: [{ normalizedName: "asc" }, { id: "asc" }],
    });
    const balances = await readStockBalances(items.map((item) => item.id), transaction);
    const rows: InventoryListItem[] = items.map((item) => {
      const balance = balances.get(item.id)!;
      return { ...item, balance, stockStatus: inventoryStockStatus(balance, item.reorderLevel) };
    });
    return { ok: true, rows };
  });
}
