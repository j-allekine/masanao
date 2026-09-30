import "server-only";

import { setRecipeActiveRecord } from "../db/recipes";

export async function setRecipeActiveCommand(id: string, isActive: boolean) {
  return setRecipeActiveRecord(id, isActive);
}
