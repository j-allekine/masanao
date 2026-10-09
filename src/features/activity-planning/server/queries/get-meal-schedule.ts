import "server-only";

import { getMealScheduleRecord } from "../db/meal-schedules";

export async function getMealSchedule(
  activityDesignId: string,
  activityId: string,
  mealScheduleId: string,
) {
  return getMealScheduleRecord(activityDesignId, activityId, mealScheduleId);
}
