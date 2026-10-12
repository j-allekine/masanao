"use server";
import { revalidatePath } from "next/cache";
import { getCurrentIssuanceActor } from "./server/actions/current-actor";
import { listIssuanceRecipes, previewIssuanceRecipe, saveIssuanceDraft, listIssuanceStockItems, getIssuanceReviewReferences, postIssuance } from "./server";
import type { IssuanceContext } from "./types";
export async function listIssuanceRecipesAction() { return listIssuanceRecipes(await getCurrentIssuanceActor()); }
export async function getIssuanceReviewReferencesAction(itemIds: string[]) { return getIssuanceReviewReferences(await getCurrentIssuanceActor(), itemIds); }
export async function listIssuanceStockItemsAction() { return listIssuanceStockItems(await getCurrentIssuanceActor()); }
export async function previewIssuanceRecipeAction(id: string) { return previewIssuanceRecipe(await getCurrentIssuanceActor(), id); }
export async function postIssuanceAction(context: IssuanceContext, input: unknown) {
  const result = await postIssuance(await getCurrentIssuanceActor(), context, input);
  if (result.ok) revalidatePath(`/activity-designs/${context.activityDesignId}/activities/${context.activityId}/meal-schedules/${context.mealScheduleId}/issuance`);
  return result;
}
export async function saveIssuanceDraftAction(context: IssuanceContext, input: unknown) {
  const result = await saveIssuanceDraft(await getCurrentIssuanceActor(), context, input);
  if (result.ok) revalidatePath(`/activity-designs/${context.activityDesignId}/activities/${context.activityId}/meal-schedules/${context.mealScheduleId}/issuance`);
  return result;
}
