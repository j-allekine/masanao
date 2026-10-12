"use server";
import { revalidatePath } from "next/cache";
import { getCurrentIssuanceActor } from "./server/actions/current-actor";
import { listIssuanceRecipes, previewIssuanceRecipe, saveIssuanceDraft } from "./server";
import type { IssuanceContext } from "./types";
export async function listIssuanceRecipesAction() { return listIssuanceRecipes(await getCurrentIssuanceActor()); }
export async function previewIssuanceRecipeAction(id: string) { return previewIssuanceRecipe(await getCurrentIssuanceActor(), id); }
export async function saveIssuanceDraftAction(context: IssuanceContext, input: unknown) {
  const result = await saveIssuanceDraft(await getCurrentIssuanceActor(), context, input);
  if (result.ok) revalidatePath(`/activity-designs/${context.activityDesignId}/activities/${context.activityId}/meal-schedules/${context.mealScheduleId}/issuance`);
  return result;
}
