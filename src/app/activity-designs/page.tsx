import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { auth } from "@/server/auth";
import { listActivityDesigns } from "@/features/activity-planning/server";
import { ActivityDesignsContent } from "@/features/activity-planning/ui";

export const metadata: Metadata = {
  title: "Activity Designs | Masanao",
  description: "Plan the municipal kitchen activities that come next.",
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

export default async function ActivityDesignsRoute({
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

  const activityDesigns = await listActivityDesigns();
  const initialQuery = toQueryString(await searchParams);

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="activity-designs"
    >
      <ActivityDesignsContent
        initialActivityDesigns={activityDesigns}
        initialQuery={initialQuery}
      />
    </WorkspaceShell>
  );
}
