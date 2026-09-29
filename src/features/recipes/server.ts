import "server-only";

import type { CurrentActor } from "@/server/auth";
import { isCurrentActorAdministrator } from "@/server/current-actor-role";

import { createRecipeCommand } from "./server/commands/create-recipe";
import { listActiveRecipes as listActiveRecipesQuery } from "./server/queries/list-active-recipes";
import { listActiveRecipeIngredientOptions } from "./server/db/recipes";

export type { RecipeCatalogItem, RecipeCreateResult, RecipeIngredientOption } from "./types";

export async function listActiveRecipes() {
  return listActiveRecipesQuery();
}

export async function listActiveRecipeItems() {
  return listActiveRecipeIngredientOptions();
}

export async function canManageRecipes(actor: CurrentActor) {
  return isCurrentActorAdministrator(actor.id);
}

export async function createRecipe(
  actor: CurrentActor,
  input: unknown,
) {
  if (!(await canManageRecipes(actor))) {
    return {
      ok: false as const,
      kind: "forbidden" as const,
      error: "Administrator access required",
      fields: {},
    };
  }

  return createRecipeCommand(input);
}
