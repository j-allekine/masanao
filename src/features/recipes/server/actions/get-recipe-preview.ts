"use server";

import { getRecipePreview } from "../../server";
import type { RecipePreviewActionState } from "../../types";
import { getCurrentRecipesActor } from "./current-actor";

export async function executeGetRecipePreview(
  id: string,
): Promise<RecipePreviewActionState> {
  const actor = await getCurrentRecipesActor();
  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
    };
  }

  const recipe = await getRecipePreview(actor, id);
  if (!recipe) {
    return {
      status: "error",
      kind: "not-found",
      error: "Recipe not found",
    };
  }

  return { status: "success", recipe };
}
