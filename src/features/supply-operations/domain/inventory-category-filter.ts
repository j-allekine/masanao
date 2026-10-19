import type { InventoryListItem } from "../types";

// Derive options from the complete eligible list, including related inactive Categories.
export function inventoryCategories(items: InventoryListItem[]) {
  return [...new Map(items.map((item) => [item.category.id, item.category])).values()]
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

export function filterInventoryCategory(items: InventoryListItem[], categoryId: string) {
  return categoryId ? items.filter((item) => item.category.id === categoryId) : items;
}
