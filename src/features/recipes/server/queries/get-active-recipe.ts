import "server-only";

import { getActiveRecipeRecord } from "../db/recipes";

export async function getActiveRecipe(id: string) {
  return getActiveRecipeRecord(id);
}
