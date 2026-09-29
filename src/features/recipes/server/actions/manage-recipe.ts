"use server";

import { revalidatePath } from "next/cache";

import { deleteRecipe, setRecipeActive } from "../../server";
import type { RecipeLifecycleActionState } from "../../types";
import { getCurrentRecipesActor } from "./current-actor";

async function withActor(
  operation: (actor: NonNullable<Awaited<ReturnType<typeof getCurrentRecipesActor>>>) => Promise<{ ok: boolean; kind?: string; error?: string }>,
  successMessage: string,
): Promise<RecipeLifecycleActionState> {
  const actor = await getCurrentRecipesActor();
  if (!actor) return { status: "error", kind: "authentication", error: "Authentication required" };
  const result = await operation(actor);
  if (!result.ok) return { status: "error", kind: result.kind === "forbidden" ? "forbidden" : "not-found", error: result.error ?? "Recipe not found" };
  revalidatePath("/recipes");
  return { status: "success", message: successMessage };
}

export async function executeSetRecipeActive(id: string, isActive: boolean) {
  return withActor((actor) => setRecipeActive(actor, id, isActive), isActive ? "Recipe reactivated." : "Recipe deactivated.");
}

export async function executeDeleteRecipe(id: string) {
  return withActor((actor) => deleteRecipe(actor, id), "Recipe deleted.");
}
