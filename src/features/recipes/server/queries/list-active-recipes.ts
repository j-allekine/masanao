import "server-only";

import { listRecipeRecords } from "../db/recipes";

export async function listActiveRecipes(includeInactive = false) {
  return listRecipeRecords(includeInactive);
}
