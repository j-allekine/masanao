import type { RecipeCatalogItem } from "../types";

export type RecipeListFilters = {
  search: string;
};

export function filterRecipes(
  recipes: RecipeCatalogItem[],
  { search }: RecipeListFilters,
) {
  const normalizedSearch = search.trim().replace(/\s+/g, " ").toLowerCase();

  return recipes.filter(
    (recipe) =>
      normalizedSearch === "" ||
      recipe.name.toLowerCase().includes(normalizedSearch),
  );
}

export function hasRecipeListFilters({ search }: RecipeListFilters) {
  return search.trim() !== "";
}
