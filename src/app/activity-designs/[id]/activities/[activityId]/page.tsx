import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { getActivity } from "@/features/activity-planning/server";
import { ActivityDetailContent } from "@/features/activity-planning/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Activity | Masanao",
  description: "Review a municipal kitchen Activity and its Meal Schedules.",
};

export default async function ActivityDetailRoute(
  props: PageProps<"/activity-designs/[id]/activities/[activityId]">,
) {
  const [{ id, activityId }, session] = await Promise.all([
    props.params,
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!session) {
    redirect("/");
  }

  const activity = await getActivity(id, activityId);
  if (!activity) notFound();

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="activity-designs"
    >
      <ActivityDetailContent activity={activity} />
    </WorkspaceShell>
  );
}
