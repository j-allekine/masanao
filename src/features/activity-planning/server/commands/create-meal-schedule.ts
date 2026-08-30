import "server-only";

import {
  mealScheduleFieldErrors,
  mealScheduleSchema,
} from "../../schemas/meal-schedule";
import type { MealScheduleCreateResult } from "../../types";
import { createMealScheduleRecord } from "../db/meal-schedules";

export async function createMealScheduleCommand(
  activityDesignId: string,
  activityId: string,
  input: unknown,
): Promise<MealScheduleCreateResult> {
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
    activityId.trim() === ""
  ) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Activity could not be found.",
      fields: {},
    };
  }

  const mealSchedule = await createMealScheduleRecord(
    activityDesignId,
    activityId,
    parsedInput.data,
  );

  if (!mealSchedule) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Activity could not be found.",
      fields: {},
    };
  }

  return { ok: true, mealSchedule };
}
