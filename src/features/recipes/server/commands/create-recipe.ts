import "server-only";

import { recipeFieldErrors, recipeSchema } from "../../schemas/recipe";
import type { RecipeCreateResult, RecipeFieldErrors } from "../../types";
import { createRecipeWithActiveItems } from "../db/recipes";

function validationResult(
  fields: RecipeFieldErrors,
  error = "Please correct the highlighted Recipe fields.",
): RecipeCreateResult {
  return { ok: false, kind: "validation", error, fields };
}

export async function createRecipeCommand(
  input: unknown,
): Promise<RecipeCreateResult> {
  const parsedInput = recipeSchema.safeParse(input);
  if (!parsedInput.success) {
    return validationResult(recipeFieldErrors(parsedInput.error));
  }

  const result = await createRecipeWithActiveItems(parsedInput.data);
  if (result.kind === "invalid-ingredients") {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Ingredient rows.",
      fields: result.fields,
    };
  }
  if (result.kind === "invalid-conversion") {
    return {
      ok: false,
      kind: "validation",
      error: "Please choose an active Unit configured for each Ingredient Item.",
      fields: {
        ingredients: ["Choose the Base Unit or an active configured alternate Unit for this Item."],
      },
    };
  }
  if (result.kind === "duplicate") {
    const message = "A Recipe with that name already exists.";
    return { ok: false, kind: "duplicate", error: message, fields: { name: [message] } };
  }

  return { ok: true, recipe: result.recipe };
}
