import "server-only";

import { headers } from "next/headers";

import { auth } from "@/server/auth";

import { deleteMealSchedule } from "../../server";
import type { MealScheduleDeleteActionState } from "../../types";

export async function executeDeleteMealSchedule(
  activityDesignId: string,
  activityId: string,
  mealScheduleId: string,
): Promise<MealScheduleDeleteActionState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { status: "error", error: "Authentication required" };
  }

  if (
    typeof activityDesignId !== "string" ||
    activityDesignId.trim() === "" ||
    typeof activityId !== "string" ||
    activityId.trim() === "" ||
    typeof mealScheduleId !== "string" ||
    mealScheduleId.trim() === ""
  ) {
    return { status: "error", error: "The Meal Schedule could not be found." };
  }

  try {
    const result = await deleteMealSchedule(
      activityDesignId,
      activityId,
      mealScheduleId,
    );

    if (!result.ok) {
      return { status: "error", error: result.error };
    }

    return { status: "success" };
  } catch {
    return {
      status: "error",
      error:
        "The Meal Schedule could not be deleted. Check your connection and try again.",
    };
  }
}
