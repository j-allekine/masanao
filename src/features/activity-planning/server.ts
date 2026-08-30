import "server-only";

import { createActivityCommand } from "./server/commands/create-activity";
import { createActivityDesignCommand } from "./server/commands/create-activity-design";
import { createMealScheduleCommand } from "./server/commands/create-meal-schedule";
import { deleteMealScheduleCommand } from "./server/commands/delete-meal-schedule";
import { deleteActivityCommand } from "./server/commands/delete-activity";
import { deleteActivityDesignCommand } from "./server/commands/delete-activity-design";
import { updateMealScheduleCommand } from "./server/commands/update-meal-schedule";
import { updateActivityCommand } from "./server/commands/update-activity";
import { updateActivityDesignCommand } from "./server/commands/update-activity-design";
import { getActivityDesign as getActivityDesignQuery } from "./server/queries/get-activity-design";
import { listActivityDesigns as listActivityDesignQuery } from "./server/queries/list-activity-designs";
import type {
  MealScheduleCreateResult,
  MealScheduleDeleteResult,
  MealScheduleUpdateResult,
} from "./types";

export type {
  ActivityCreateResult,
  ActivityDeleteResult,
  ActivityDesignDetail,
  ActivityDesignDeleteResult,
  ActivityDesignCreateResult,
  ActivityDesignListItem,
  ActivityUpdateResult,
  ActivityDesignUpdateResult,
  MealScheduleCreateResult,
  MealScheduleDeleteResult,
  MealScheduleUpdateResult,
} from "./types";

export async function listActivityDesigns() {
  return listActivityDesignQuery();
}

export async function createActivityDesign(input: unknown) {
  return createActivityDesignCommand(input);
}

export async function createActivity(activityDesignId: string, input: unknown) {
  return createActivityCommand(activityDesignId, input);
}

export async function createMealSchedule(
  activityDesignId: string,
  activityId: string,
  input: unknown,
): Promise<MealScheduleCreateResult> {
  return createMealScheduleCommand(activityDesignId, activityId, input);
}

export async function updateMealSchedule(
  activityDesignId: string,
  activityId: string,
  mealScheduleId: string,
  input: unknown,
): Promise<MealScheduleUpdateResult> {
  return updateMealScheduleCommand(
    activityDesignId,
    activityId,
    mealScheduleId,
    input,
  );
}

export async function deleteMealSchedule(
  activityDesignId: string,
  activityId: string,
  mealScheduleId: string,
): Promise<MealScheduleDeleteResult> {
  return deleteMealScheduleCommand(
    activityDesignId,
    activityId,
    mealScheduleId,
  );
}

export async function updateActivity(
  activityDesignId: string,
  activityId: string,
  input: unknown,
) {
  return updateActivityCommand(activityDesignId, activityId, input);
}

export async function deleteActivity(
  activityDesignId: string,
  activityId: string,
) {
  return deleteActivityCommand(activityDesignId, activityId);
}

export async function getActivityDesign(id: string) {
  return getActivityDesignQuery(id);
}

export async function updateActivityDesign(id: string, input: unknown) {
  return updateActivityDesignCommand(id, input);
}

export async function deleteActivityDesign(id: string) {
  return deleteActivityDesignCommand(id);
}
