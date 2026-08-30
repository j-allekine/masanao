import "server-only";

import {
  mealScheduleFieldErrors,
  mealScheduleSchema,
} from "../../schemas/meal-schedule";
import type { MealScheduleUpdateResult } from "../../types";
import { updateMealScheduleRecord } from "../db/meal-schedules";

export async function updateMealScheduleCommand(
  activityDesignId: string,
  activityId: string,
  mealScheduleId: string,
  input: unknown,
): Promise<MealScheduleUpdateResult> {
  const parsedInput = mealScheduleSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Meal Schedule fields.",
      fields: mealScheduleFieldErrors(parsedInput.error),
    };
  }

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
      fields: {},
    };
  }

  const mealSchedule = await updateMealScheduleRecord(
    activityDesignId,
    activityId,
    mealScheduleId,
    parsedInput.data,
  );

  if (!mealSchedule) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Meal Schedule could not be found.",
      fields: {},
    };
  }

  return { ok: true, mealSchedule };
}
