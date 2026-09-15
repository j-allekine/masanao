import type { CategoryListItem } from "../types";

export type CategoryFilters = {
  search: string;
};

export function filterCategories(
  categories: CategoryListItem[],
  filters: CategoryFilters,
) {
  const search = filters.search.trim().toLowerCase();

  return categories.filter((category) => {
    return (
      search === "" ||
      category.name.toLowerCase().includes(search) ||
      (category.description?.toLowerCase().includes(search) ?? false)
    );
  });
}

export function hasCategoryFilters(filters: CategoryFilters) {
  return filters.search.trim() !== "";
}
