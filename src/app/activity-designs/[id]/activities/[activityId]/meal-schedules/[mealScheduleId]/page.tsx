import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { getMealSchedule } from "@/features/activity-planning/server";
import { MealScheduleDetailContent } from "@/features/activity-planning/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Meal Schedule | Masanao",
  description: "Review a municipal kitchen Meal Schedule and its planning context.",
};

export default async function MealScheduleDetailRoute(
  props: PageProps<"/activity-designs/[id]/activities/[activityId]/meal-schedules/[mealScheduleId]">,
) {
  const [{ id, activityId, mealScheduleId }, session] = await Promise.all([
    props.params,
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!session) {
    redirect("/");
  }

  const mealSchedule = await getMealSchedule(id, activityId, mealScheduleId);
  if (!mealSchedule) notFound();

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="activity-designs"
    >
      <MealScheduleDetailContent mealSchedule={mealSchedule} />
    </WorkspaceShell>
  );
}
