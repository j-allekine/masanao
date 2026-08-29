import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace-shell";
import { auth } from "@/lib/auth";
import { listActivityDesigns } from "@/lib/activity-designs";
import ActivityDesignsContent from "./activity-designs-content";

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
