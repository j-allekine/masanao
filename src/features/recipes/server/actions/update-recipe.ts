"use server";

import { revalidatePath } from "next/cache";
import { updateRecipe } from "../../server";
import type { RecipeFormActionState } from "../../types";
import { getCurrentRecipesActor } from "./current-actor";

export async function executeUpdateRecipe(id: string, formData: FormData): Promise<RecipeFormActionState> {
  const actor = await getCurrentRecipesActor();
  if (!actor) return { status: "error", kind: "authentication", error: "Authentication required", fields: {} };
  try {
    const result = await updateRecipe(actor, id, { name: formData.get("name"), preparationNote: formData.get("preparationNote"), ingredients: JSON.parse(String(formData.get("ingredients") ?? "[]")) });
    if (!result.ok) return { status: "error", kind: result.kind, error: result.error, fields: result.fields };
    revalidatePath("/recipes"); revalidatePath(`/recipes/${id}`);
    return { status: "success", recipe: result.recipe };
  } catch { return { status: "error", kind: "server", error: "The Recipe could not be saved. Check your connection and try again.", fields: {} }; }
}
