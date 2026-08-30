import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import WorkspaceShell from "@/app/_components/workspace-shell";
import { auth } from "@/server/auth";
import { listActivityDesigns } from "@/features/activity-planning/server";
import { ActivityDesignsContent } from "@/features/activity-planning/ui";

export const metadata: Metadata = {
  title: "Activity Designs | Masanao",
  description: "Plan the municipal kitchen activities that come next.",
};

export default async function ActivityDesignsRoute() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const activityDesigns = await listActivityDesigns();

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activePath="/activity-designs"
    >
      <ActivityDesignsContent initialActivityDesigns={activityDesigns} />
    </WorkspaceShell>
  );
}
