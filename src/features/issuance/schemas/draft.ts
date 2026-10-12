import { z } from "zod";
export const paxSchema = z.number().int().min(1).max(2147483647);
export const contextSchema = z.object({ activityDesignId: z.string().min(1), activityId: z.string().min(1), mealScheduleId: z.string().min(1) }).strict();
const targetSchema = { targetMode: z.enum(["meal", "explicit"]), targetPax: paxSchema.nullable() };
const existingSchema = z.object({ snapshotId: z.string().min(1), ...targetSchema }).strict();
const newSchema = z.object({ recipeId: z.string().min(1), sourceRevision: z.string().min(1), ...targetSchema }).strict();
export const saveDraftSchema = z.object({
  revision: z.number().int().nonnegative(), mealPax: paxSchema.nullable(),
  recipes: z.array(z.union([existingSchema, newSchema])),
}).strict().superRefine((input, context) => {
  const identities = new Set<string>();
  input.recipes.forEach((recipe, index) => {
    const identity = "snapshotId" in recipe ? recipe.snapshotId : recipe.recipeId;
    if (identities.has(identity)) context.addIssue({ code: "custom", path: ["recipes", index], message: "A Recipe can be selected only once." });
    identities.add(identity);
    if ("recipeId" in recipe && recipe.targetMode === "explicit" && recipe.targetPax === input.mealPax) context.addIssue({ code: "custom", path: ["recipes", index, "targetMode"], message: "New Recipes with Meal pax must inherit the meal target." });
    if (recipe.targetMode === "explicit" && recipe.targetPax === null) context.addIssue({ code: "custom", path: ["recipes", index, "targetPax"], message: "Enter positive whole-number target pax." });
    if (recipe.targetMode === "meal" && recipe.targetPax !== input.mealPax) context.addIssue({ code: "custom", path: ["recipes", index, "targetPax"], message: "Inherited targets must follow Meal pax." });
  });
});
export type SaveDraftInput = z.infer<typeof saveDraftSchema>;


