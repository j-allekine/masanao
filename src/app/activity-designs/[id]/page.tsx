import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { getActivityDesign } from "@/features/activity-planning/server";
import { ActivityDesignDetailContent } from "@/features/activity-planning/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Activity Design | Masanao",
  description: "Review a municipal kitchen Activity Design and its Activities.",
};

export default async function ActivityDesignDetailRoute(
  props: PageProps<"/activity-designs/[id]">,
) {
  const [{ id }, session] = await Promise.all([
    props.params,
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!session) {
    redirect("/");
  }

  const activityDesign = await getActivityDesign(id);
  if (!activityDesign) notFound();

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
