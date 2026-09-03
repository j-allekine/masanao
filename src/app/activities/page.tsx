import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

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

type PageSearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams: PageSearchParams) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }

  return query.toString();
}

export default async function ActivitiesRoute({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  await connection();

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
  const initialQuery = toQueryString(await searchParams);

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
        initialQuery={initialQuery}
      />
    </WorkspaceShell>
  );
}
