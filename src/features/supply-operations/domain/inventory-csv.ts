import type { InventoryListItem } from "../types";
import { stockStatusLabels } from "./inventory";

// Quote every cell. Prefix spreadsheet formulas even when hidden behind whitespace
// or control characters; quoting alone does not stop spreadsheet evaluation.
function csvCell(value: string) {
  const safe = /^[\s\u0000-\u001f\u007f-\u009f]*[=+@-]/u.test(value) || /^[\t\r\n]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function formatInventoryCsv(items: InventoryListItem[], generatedAt: string) {
  const rows = [["Item", "Category", "Base Unit", "On hand", "Reorder level", "Stock status", "Generation time"], ...items.map((item) => [
    item.name, item.category.name, `${item.baseUnit.name} (${item.baseUnit.abbreviation})`,
    item.balance.kind === "valid" ? item.balance.quantity : "Unavailable",
    item.reorderLevel, stockStatusLabels[item.stockStatus], generatedAt,
  ])];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

