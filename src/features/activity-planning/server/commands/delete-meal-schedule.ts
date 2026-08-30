import "server-only";

import type { MealScheduleDeleteResult } from "../../types";
import { deleteMealScheduleRecord } from "../db/meal-schedules";

export async function deleteMealScheduleCommand(
  activityDesignId: string,
  activityId: string,
  mealScheduleId: string,
): Promise<MealScheduleDeleteResult> {
  if (
    typeof activityDesignId !== "string" ||
    activityDesignId.trim() === "" ||
    typeof activityId !== "string" ||
    activityId.trim() === "" ||
    typeof mealScheduleId !== "string" ||
    mealScheduleId.trim() === ""
  ) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Meal Schedule could not be found.",
    };
  }

  const result = await deleteMealScheduleRecord(
    activityDesignId,
    activityId,
    mealScheduleId,
  );

  if (!result) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Meal Schedule could not be found.",
    };
  }

  if (!result.deleted) {
    return {
      ok: false,
      kind: "has-issuance-record",
      error:
        "This Meal Schedule cannot be deleted while it has an Issuance Record.",
    };
  }

  return { ok: true };
}
