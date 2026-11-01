import { redirect } from "next/navigation";
import { getPlanningRecordUrl } from "@/features/activity-planning/server";

/** Existing issuance bookmarks retain only supported, validated Planning context. */
export default async function IssuanceRoute({ params, searchParams }: {
  params: Promise<{ id: string; activityId: string; mealScheduleId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id, activityId, mealScheduleId }, search] = await Promise.all([params, searchParams]);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    for (const part of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, part);
  }
  redirect(getPlanningRecordUrl(`/activity-designs/${id}/activities/${activityId}/meal-schedules/${mealScheduleId}`, query, id, activityId));
}
