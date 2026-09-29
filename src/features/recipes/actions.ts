"use server";

import type { RecipeFormActionState } from "./types";
import { executeCreateRecipe } from "./server/actions/create-recipe";

export async function createRecipeAction(
  formData: FormData,
): Promise<RecipeFormActionState> {
  return executeCreateRecipe(formData);
}
