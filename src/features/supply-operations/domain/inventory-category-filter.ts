import type { InventoryListItem } from "../types";

// Derive options from the complete eligible list, including related inactive Categories.
export function inventoryCategories(items: InventoryListItem[]) {
  return [...new Map(items.map((item) => [item.category.id, item.category])).values()]
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}
