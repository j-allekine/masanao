import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { ActivityDesignDetailContent } from "@/features/activity-planning/ui";
import { getActivityDesign } from "@/features/activity-planning/server";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Activity Design | Masanao",
  description: "Plan Activities under an Activity Design.",
};

export default async function ActivityDesignDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const { id } = await params;
  const activityDesign = await getActivityDesign(id);

  if (!activityDesign) {
    notFound();
  }

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="activity-designs"
    >
      <ActivityDesignDetailContent activityDesign={activityDesign} />
    </WorkspaceShell>
  );
}
