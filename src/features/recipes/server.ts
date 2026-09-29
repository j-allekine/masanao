import "server-only";

import type { CurrentActor } from "@/server/auth";
import { isCurrentActorAdministrator } from "@/server/current-actor-role";

import { createRecipeCommand } from "./server/commands/create-recipe";
import { getActiveRecipe as getActiveRecipeQuery } from "./server/queries/get-active-recipe";
import { listActiveRecipes as listActiveRecipesQuery } from "./server/queries/list-active-recipes";
import { listActiveRecipeIngredientOptions } from "./server/db/recipes";

export type {
  RecipeCatalogItem,
  RecipeCreateResult,
  RecipeDetailItem,
  RecipeIngredientOption,
} from "./types";

export async function listActiveRecipes() {
  return listActiveRecipesQuery();
}

export async function getActiveRecipe(id: string) {
  return getActiveRecipeQuery(id);
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
