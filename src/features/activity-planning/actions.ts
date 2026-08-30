"use server";

import { executeCreateActivity } from "./server/actions/create-activity";
import { executeCreateActivityDesign } from "./server/actions/create-activity-design";
import { executeDeleteActivityDesign } from "./server/actions/delete-activity-design";
import { executeUpdateActivityDesign } from "./server/actions/update-activity-design";
import type {
  ActivityDesignActionState,
  ActivityDesignDeleteActionState,
  ActivityDesignUpdateActionState,
} from "./types";

export async function createActivityDesignAction(
  formData: FormData,
): Promise<ActivityDesignActionState> {
  return executeCreateActivityDesign(formData);
}

export async function createActivityAction(formData: FormData) {
  return executeCreateActivity(formData);
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
