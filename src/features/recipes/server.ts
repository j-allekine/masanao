import "server-only";

import { listActiveRecipes as listActiveRecipesQuery } from "./server/queries/list-active-recipes";

export type { RecipeCatalogItem } from "./types";

export async function listActiveRecipes() {
  return listActiveRecipesQuery();
}
