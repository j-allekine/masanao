import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { ActivitiesContent } from "@/features/activity-planning/ui";
import {
  listActivities,
  listActivityDesigns,
} from "@/features/activity-planning/server";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Activities | Masanao",
  description: "Browse municipal kitchen activities across planning contexts.",
};

export default async function ActivitiesRoute() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const [activities, activityDesigns] = await Promise.all([
    listActivities(),
    listActivityDesigns(),
  ]);

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="activity-designs"
    >
      <ActivitiesContent
        initialActivities={activities}
        initialActivityDesigns={activityDesigns}
      />
    </WorkspaceShell>
  );
}
