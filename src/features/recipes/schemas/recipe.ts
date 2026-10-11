import { z } from "zod";

import {
  normalizeRecipeDisplayValue,
  normalizeRecipeKey,
  normalizeRecipeNote,
  RECIPE_NAME_MAX_LENGTH,
  RECIPE_PREPARATION_NOTE_MAX_LENGTH,
} from "../domain/recipe";
import type { RecipeFieldErrors, RecipeIngredientField } from "../types";

const positiveDecimal = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const baselinePaxSchema = z
  .union([z.string(), z.number()], { error: "Enter the number of people these ingredients serve." })
  .transform((value) => String(value).trim())
  .pipe(z.string()
    .min(1, "Enter the number of people these ingredients serve.")
    .regex(/^[1-9]\d*$/, "Enter a positive whole number of pax.")
    .refine((value) => Number.isSafeInteger(Number(value)) && Number(value) <= 2_147_483_647,
      "Enter a whole number no greater than 2,147,483,647."))
  .transform(Number);

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
  itemUnitConversionId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => value || null),
  quantity: z
    .string()
    .trim()
    .regex(positiveDecimal, "Enter a positive exact-decimal quantity.")
    .refine((value) => Number(value) > 0, "Enter a positive exact-decimal quantity."),
});

export const recipeSchema = z
  .object({
    name: nameSchema,
    baselinePax: baselinePaxSchema.optional(),
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
  .superRefine((value, context) => {
    const firstIngredientByItemId = new Map<string, number>();

    value.ingredients.forEach((ingredient, index) => {
      const firstIndex = firstIngredientByItemId.get(ingredient.itemId);
      if (firstIndex === undefined) {
        firstIngredientByItemId.set(ingredient.itemId, index);
        return;
      }

      const message = "An Item can appear only once in a Recipe.";
      context.addIssue({ code: "custom", path: ["ingredients", firstIndex, "itemId"], message });
      context.addIssue({ code: "custom", path: ["ingredients", index, "itemId"], message });
    });
  })
  .transform((value) => ({
    ...value,
    normalizedName: normalizeRecipeKey(value.name),
    ingredients: value.ingredients.map((ingredient) => ({
      itemId: ingredient.itemId,
      itemUnitConversionId: ingredient.itemUnitConversionId,
      enteredQuantity: ingredient.quantity,
    })),
  }));

export type RecipeInput = z.infer<typeof recipeSchema>;

export function recipeFieldErrors(error: z.ZodError): RecipeFieldErrors {
  const fields: RecipeFieldErrors = {};

  for (const issue of error.issues) {
    const [field, index, ingredientField] = issue.path;
    const key: keyof RecipeFieldErrors =
      field === "ingredients" &&
      typeof index === "number" &&
      (ingredientField === "itemId" || ingredientField === "quantity" || ingredientField === "itemUnitConversionId")
        ? (`ingredients.${index}.${ingredientField}` as RecipeIngredientField)
        : field === "name" || field === "preparationNote" || field === "baselinePax" || field === "ingredients"
        ? field
        : "form";
    fields[key] ??= [];
    fields[key]?.push(issue.message);
  }

  return fields;
}
