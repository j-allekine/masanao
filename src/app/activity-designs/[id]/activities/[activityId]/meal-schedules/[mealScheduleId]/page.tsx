import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { getMealSchedule } from "@/features/activity-planning/server";
import { MealScheduleHeader } from "@/features/activity-planning/ui";
import { getIssuanceWorkspace } from "@/features/issuance/server";
import { IssuanceDraftContent } from "@/features/issuance/ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Meal Schedule | Masanao",
  description: "Prepare and review supplies for a municipal kitchen Meal Schedule.",
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

  const [mealSchedule, issuance] = await Promise.all([
    getMealSchedule(id, activityId, mealScheduleId),
    getIssuanceWorkspace({ id: session.user.id, name: session.user.name, username: session.user.username ?? null },
      { activityDesignId: id, activityId, mealScheduleId }),
  ]);
  if (!mealSchedule) notFound();

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="activity-designs"
    >
      {issuance.ok ? <IssuanceDraftContent key={mealSchedule.id} workspace={issuance.value} mealSchedule={mealSchedule} /> : (
        <main className="flex flex-col gap-6 px-4 py-5 sm:px-6">
          <MealScheduleHeader mealSchedule={mealSchedule}  />
          <Alert><AlertDescription>Issuance is available to kitchen staff and administrators.</AlertDescription></Alert>
        </main>
      )}
    </WorkspaceShell>
  );
}
