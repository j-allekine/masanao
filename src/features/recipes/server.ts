import "server-only";

import type { CurrentActor } from "@/server/auth";
import { isCurrentActorAdministrator } from "@/server/current-actor-role";

import { createRecipeCommand } from "./server/commands/create-recipe";
import { deleteRecipeCommand } from "./server/commands/delete-recipe";
import { setRecipeActiveCommand } from "./server/commands/set-recipe-active";
import { updateRecipeCommand } from "./server/commands/update-recipe";
import { getActiveRecipe as getActiveRecipeQuery } from "./server/queries/get-active-recipe";
import { listActiveRecipes as listActiveRecipesQuery } from "./server/queries/list-active-recipes";
import { getRecipeRecord, listActiveRecipeIngredientOptions } from "./server/db/recipes";

export type {
  RecipeCatalogItem,
  RecipeCreateResult,
  RecipeDetailItem,
  RecipeIngredientOption,
} from "./types";

export async function listActiveRecipes(includeInactive = false) {
  return listActiveRecipesQuery(includeInactive);
}

export async function getActiveRecipe(id: string) {
  return getActiveRecipeQuery(id);
}

export async function getRecipeForActor(actor: CurrentActor, id: string) {
  const canManage = await canManageRecipes(actor);
  return {
    canManageRecipes: canManage,
    recipe: await getRecipeRecord(id, canManage),
  };
}

export async function getRecipePreview(actor: CurrentActor, id: string) {
  return (await getRecipeForActor(actor, id)).recipe;
}

export async function listActiveRecipeItems() {
  return listActiveRecipeIngredientOptions();
}

export async function canManageRecipes(actor: CurrentActor) {
  return isCurrentActorAdministrator(actor.id);
}

async function authorizeRecipeAdministrator(actor: CurrentActor) {
  if (await canManageRecipes(actor)) return null;

  return {
    ok: false as const,
    kind: "forbidden" as const,
    error: "Administrator access required",
    fields: {},
  };
}

export async function createRecipe(
  actor: CurrentActor,
  input: unknown,
) {
  const authorizationFailure = await authorizeRecipeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  return createRecipeCommand(input);
}

export async function updateRecipe(actor: CurrentActor, id: string, input: unknown) {
  const authorizationFailure = await authorizeRecipeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;
  return updateRecipeCommand(id, input);
}

export async function setRecipeActive(actor: CurrentActor, id: string, isActive: boolean) {
  const authorizationFailure = await authorizeRecipeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;
  const result = await setRecipeActiveCommand(id, isActive);
  if (result.kind === "not-found") return { ok: false as const, kind: "not-found" as const, error: "Recipe not found" };
  return { ok: true as const };
}

export async function deleteRecipe(actor: CurrentActor, id: string) {
  const authorizationFailure = await authorizeRecipeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;
  const result = await deleteRecipeCommand(id);
  if (result.kind === "not-found") return { ok: false as const, kind: "not-found" as const, error: "Recipe not found" };
  return { ok: true as const };
}
