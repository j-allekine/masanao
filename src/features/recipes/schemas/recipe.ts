import { z } from "zod";

import {
  normalizeRecipeDisplayValue,
  normalizeRecipeKey,
  normalizeRecipeNote,
  RECIPE_NAME_MAX_LENGTH,
  RECIPE_PREPARATION_NOTE_MAX_LENGTH,
} from "../domain/recipe";
import type { RecipeFieldErrors } from "../types";

const positiveDecimal = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

const nameSchema = z
  .string({ error: "Recipe name is required" })
  .transform(normalizeRecipeDisplayValue)
  .pipe(
    z
      .string()
      .min(1, "Recipe name is required")
      .max(
        RECIPE_NAME_MAX_LENGTH,
        `Recipe name must be ${RECIPE_NAME_MAX_LENGTH} characters or fewer`,
      ),
  );

const ingredientSchema = z.object({
  itemId: z.string().trim().min(1, "Select an Item."),
  quantity: z
    .string()
    .trim()
    .regex(positiveDecimal, "Enter a positive exact-decimal quantity.")
    .refine((value) => Number(value) > 0, "Enter a positive exact-decimal quantity."),
});

export const recipeSchema = z
  .object({
    name: nameSchema,
    preparationNote: z
      .string()
      .optional()
      .transform((value) => normalizeRecipeNote(value ?? ""))
      .pipe(
        z
          .string()
          .max(
            RECIPE_PREPARATION_NOTE_MAX_LENGTH,
            `Preparation note must be ${RECIPE_PREPARATION_NOTE_MAX_LENGTH} characters or fewer`,
          ),
      )
      .transform((value) => (value === "" ? null : value)),
    ingredients: z.array(ingredientSchema).min(1, "Add at least one Ingredient."),
  })
  .transform((value) => ({
    ...value,
    normalizedName: normalizeRecipeKey(value.name),
    ingredients: value.ingredients.map((ingredient) => ({
      itemId: ingredient.itemId,
      enteredQuantity: ingredient.quantity,
    })),
  }));

export type RecipeInput = z.infer<typeof recipeSchema>;

export function recipeFieldErrors(error: z.ZodError): RecipeFieldErrors {
  const fields: RecipeFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    const key =
      field === "name" || field === "preparationNote" || field === "ingredients"
        ? field
        : "form";
    fields[key] ??= [];
    fields[key]?.push(issue.message);
  }

  return fields;
}
