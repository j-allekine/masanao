import { redirect } from "next/navigation";

/** Existing issuance bookmarks resolve to the single Meal Schedule workspace. */
export default async function IssuanceRoute({ params }: {
  params: Promise<{ id: string; activityId: string; mealScheduleId: string }>;
}) {
  const { id, activityId, mealScheduleId } = await params;
  redirect(`/activity-designs/${id}/activities/${activityId}/meal-schedules/${mealScheduleId}`);
}
