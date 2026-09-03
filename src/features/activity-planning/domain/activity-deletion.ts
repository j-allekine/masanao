export function isActivityDeletionBlocked(mealScheduleCount: number) {
  return mealScheduleCount > 0;
}

export function getActivityDeletionBlockMessage(mealScheduleCount: number) {
  return `This Activity cannot be deleted while it has ${mealScheduleCount} ${mealScheduleCount === 1 ? "Meal Schedule" : "Meal Schedules"}. Remove its Meal Schedules first.`;
}
