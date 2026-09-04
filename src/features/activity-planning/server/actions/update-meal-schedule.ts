import "server-only";

import { headers } from "next/headers";

import { auth } from "@/server/auth";

import { updateMealSchedule } from "../../server";
import type { MealScheduleActionState } from "../../types";

export async function executeUpdateMealSchedule(
  formData: FormData,
): Promise<MealScheduleActionState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      status: "error",
      error: "Authentication required",
      fields: {},
    };
  }

  const activityDesignId = formData.get("activityDesignId");
  const activityId = formData.get("activityId");
  const mealScheduleId = formData.get("mealScheduleId");
  if (
    typeof activityDesignId !== "string" ||
    activityDesignId.trim() === "" ||
    typeof activityId !== "string" ||
    activityId.trim() === "" ||
    typeof mealScheduleId !== "string" ||
    mealScheduleId.trim() === ""
  ) {
    return {
      status: "error",
      error: "The Meal Schedule could not be found.",
      fields: {},
    };
  }

  try {
    const input = Object.fromEntries(formData.entries());
    delete input.activityDesignId;
    delete input.activityId;
    delete input.mealScheduleId;

    const result = await updateMealSchedule(
      activityDesignId,
      activityId,
      mealScheduleId,
      input,
    );

    if (!result.ok) {
      return {
        status: "error",
        error: result.error,
        fields: result.fields,
      };
    }

    return { status: "success", mealSchedule: result.mealSchedule };
  } catch {
    return {
      status: "error",
      error:
        "The Meal Schedule could not be saved. Check your connection and try again.",
      fields: {},
    };
  }
}
