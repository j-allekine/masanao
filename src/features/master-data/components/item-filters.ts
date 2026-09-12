import type { ItemListItem } from "../types";
import type { ItemListStatus } from "./item-list-state";

export type ItemListFilters = {
  search: string;
  categoryId: string;
  status: ItemListStatus;
};

export function filterItems(
  items: ItemListItem[],
  filters: ItemListFilters,
) {
  const search = filters.search.trim().replace(/\s+/g, " ").toLowerCase();

  return items
    .filter((item) => {
      const matchesSearch =
        search === "" || item.name.toLowerCase().includes(search);
      const matchesCategory =
        filters.categoryId === "" || item.category.id === filters.categoryId;
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "active" ? item.isActive : !item.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, undefined, {
          sensitivity: "base",
        }) || left.id.localeCompare(right.id),
    );
}

export function hasItemListFilters(filters: ItemListFilters) {
  return (
    filters.search.trim() !== "" ||
    filters.categoryId !== "" ||
    filters.status !== "all"
  );
}
