import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import { getIssuanceWorkspace } from "@/features/issuance/server";
import { IssuanceDraftContent } from "@/features/issuance/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = { title: "Issuance | Masanao" };

export default async function IssuanceRoute({
  params,
}: {
  params: Promise<{ id: string; activityId: string; mealScheduleId: string }>;
}) {
  const [{ id, activityId, mealScheduleId }, session] = await Promise.all([
    params,
    auth.api.getSession({ headers: await headers() }),
  ]);
  if (!session) redirect("/");
  const result = await getIssuanceWorkspace(
    {
      id: session.user.id,
      name: session.user.name,
      username: session.user.username ?? null,
    },
    { activityDesignId: id, activityId, mealScheduleId },
  );
  if (!result.ok) notFound();
  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="activity-designs"
    >
      <IssuanceDraftContent workspace={result.value} />
    </WorkspaceShell>
  );
}
