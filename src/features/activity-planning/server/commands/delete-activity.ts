import "server-only";

import type { ActivityDeleteResult } from "../../types";
import { deleteActivityRecord } from "../db/activities";

export async function deleteActivityCommand(
  activityDesignId: string,
  activityId: string,
): Promise<ActivityDeleteResult> {
  const result = await deleteActivityRecord(activityDesignId, activityId);

  if (!result) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Activity could not be found.",
    };
  }

  if (!result.deleted) {
    return {
      ok: false,
      kind: "has-meal-schedules",
      error:
        "This Activity cannot be deleted while it has Meal Schedules. Remove its Meal Schedules first.",
      mealScheduleCount: result.mealScheduleCount,
    };
  }

  return { ok: true };
}
