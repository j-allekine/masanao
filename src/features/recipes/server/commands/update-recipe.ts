import "server-only";

import { recipeFieldErrors, recipeSchema } from "../../schemas/recipe";
import type { RecipeCreateResult } from "../../types";
import { updateRecipeWithActiveItems } from "../db/recipes";

export async function updateRecipeCommand(id: string, input: unknown): Promise<RecipeCreateResult> {
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, kind: "validation", error: "Please correct the highlighted Recipe fields.", fields: recipeFieldErrors(parsed.error) };
  const result = await updateRecipeWithActiveItems(id, parsed.data);
  if (result.kind === "invalid-ingredients") return { ok: false, kind: "validation", error: "Please correct the highlighted Ingredient rows.", fields: result.fields };
  if (result.kind === "duplicate") return { ok: false, kind: "duplicate", error: "A Recipe with that name already exists.", fields: { name: ["A Recipe with that name already exists."] } };
  return { ok: true, recipe: result.recipe };
}
