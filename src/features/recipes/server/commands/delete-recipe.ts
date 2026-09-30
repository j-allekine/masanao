import "server-only";

import { deleteRecipeRecord } from "../db/recipes";

export async function deleteRecipeCommand(id: string) {
  return deleteRecipeRecord(id);
}
