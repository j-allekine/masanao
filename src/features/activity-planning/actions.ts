"use server";

import { executeCreateActivity } from "./server/actions/create-activity";
import { executeCreateActivityDesign } from "./server/actions/create-activity-design";
import { executeDeleteActivity } from "./server/actions/delete-activity";
import { executeDeleteActivityDesign } from "./server/actions/delete-activity-design";
import { executeUpdateActivity } from "./server/actions/update-activity";
import { executeUpdateActivityDesign } from "./server/actions/update-activity-design";
import type {
  ActivityDesignActionState,
  ActivityDeleteActionState,
  ActivityDesignDeleteActionState,
  ActivityDesignUpdateActionState,
  ActivityUpdateActionState,
} from "./types";

export async function createActivityDesignAction(
  formData: FormData,
): Promise<ActivityDesignActionState> {
  return executeCreateActivityDesign(formData);
}

export async function createActivityAction(formData: FormData) {
  return executeCreateActivity(formData);
}

export async function updateActivityAction(
  formData: FormData,
): Promise<ActivityUpdateActionState> {
  return executeUpdateActivity(formData);
}

export async function deleteActivityAction(
  activityDesignId: string,
  activityId: string,
): Promise<ActivityDeleteActionState> {
  return executeDeleteActivity(activityDesignId, activityId);
}

export async function updateActivityDesignAction(
  formData: FormData,
): Promise<ActivityDesignUpdateActionState> {
  return executeUpdateActivityDesign(formData);
}

export async function deleteActivityDesignAction(
  id: string,
): Promise<ActivityDesignDeleteActionState> {
  return executeDeleteActivityDesign(id);
}
