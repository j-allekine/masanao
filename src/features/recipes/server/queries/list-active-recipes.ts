import "server-only";

import { listActiveRecipeRecords } from "../db/recipes";

export async function listActiveRecipes() {
  return listActiveRecipeRecords();
}
