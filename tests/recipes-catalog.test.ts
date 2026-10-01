import { describe, expect, it } from "vitest";

import { filterRecipes } from "@/features/recipes/components/recipe-filters";
import {
  getRecipeListState,
  getRecipeListUrl,
} from "@/features/recipes/components/recipe-list-state";
import type { RecipeCatalogItem } from "@/features/recipes/types";

const recipes: RecipeCatalogItem[] = [
  { id: "arroz", name: "Arroz Caldo", ingredientCount: 3, isActive: true },
  { id: "tinola", name: "Chicken Tinola", ingredientCount: 4, isActive: true },
  { id: "soup", name: "Vegetable Soup", ingredientCount: 2, isActive: true },
];

describe("Recipes catalog list state", () => {
  it("matches trimmed, case-insensitive Recipe name searches", () => {
    expect(filterRecipes(recipes, { search: "  TINOLA " })).toEqual([recipes[1]]);
    expect(filterRecipes(recipes, { search: "soup" })).toEqual([recipes[2]]);
    expect(filterRecipes(recipes, { search: "missing" })).toEqual([]);
  });

  it("keeps unrelated query values and clears default Recipe list state", () => {
    expect(
      getRecipeListUrl("/recipes", "view=compact", {
        search: "Tinola",
        page: 2,
      }),
    ).toBe("/recipes?view=compact&recipesSearch=Tinola&recipesPage=2");
    expect(
      getRecipeListState(new URLSearchParams("recipesSearch=Tinola&recipesPage=3")),
    ).toEqual({ search: "Tinola", page: 3 });
    expect(
      getRecipeListUrl("/recipes", "recipesSearch=Tinola&recipesPage=3", {
        search: "",
        page: 1,
      }),
    ).toBe("/recipes");
  });

  it("treats malformed page values as the first page", () => {
    expect(getRecipeListState(new URLSearchParams("recipesPage=0"))).toMatchObject({
      page: 1,
    });
    expect(getRecipeListState(new URLSearchParams("recipesPage=one"))).toMatchObject({
      page: 1,
    });
  });
});
