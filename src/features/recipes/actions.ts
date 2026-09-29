"use server";

import type { RecipeFormActionState, RecipeLifecycleActionState } from "./types";
import { executeCreateRecipe } from "./server/actions/create-recipe";
import { executeUpdateRecipe } from "./server/actions/update-recipe";
import { executeDeleteRecipe, executeSetRecipeActive } from "./server/actions/manage-recipe";

export async function createRecipeAction(
  formData: FormData,
): Promise<RecipeFormActionState> {
  return executeCreateRecipe(formData);
}
export async function updateRecipeAction(id: string, formData: FormData): Promise<RecipeFormActionState> { return executeUpdateRecipe(id, formData); }

export async function setRecipeActiveAction(id: string, isActive: boolean): Promise<RecipeLifecycleActionState> {
  return executeSetRecipeActive(id, isActive);
}

export async function deleteRecipeAction(id: string): Promise<RecipeLifecycleActionState> {
  return executeDeleteRecipe(id);
}
