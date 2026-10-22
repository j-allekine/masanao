import "server-only";
import type { CurrentActor } from "@/server/auth";
import { filterInventory, getInventoryListState } from "../../domain/inventory-list-state";
import { formatInventoryCsv } from "../../domain/inventory-csv";
import { listInventory } from "./list-inventory";

export async function exportInventory(actor: CurrentActor | null, params: Pick<URLSearchParams, "get">) {
  const result = await listInventory(actor);
  if (!result.ok) return result;
  const generatedAt = new Date().toISOString();
  return { ok: true as const, csv: formatInventoryCsv(filterInventory(result.rows, getInventoryListState(params)), generatedAt), filename: `inventory-${generatedAt.replaceAll(":", "-")}.csv` };
}
