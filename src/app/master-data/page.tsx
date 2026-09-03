import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { MasterDataContent } from "@/features/master-data/ui";
import { canManageUnits, listUnits } from "@/features/master-data/server";
import { auth } from "@/server/auth";
import { serializeSearchParams } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Master Data | Masanao",
  description: "Maintain reusable municipal kitchen reference data.",
};

export default async function MasterDataRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const actor = {
    id: session.user.id,
    name: session.user.name ?? session.user.username ?? "Municipal staff",
    username: session.user.username ?? null,
  };
  const [units, canManage, rawSearchParams] = await Promise.all([
    listUnits(),
    canManageUnits(actor),
    searchParams,
  ]);
  const initialQuery = serializeSearchParams(rawSearchParams);

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="master-data"
    >
      <MasterDataContent
        units={units}
        initialQuery={initialQuery}
        canManage={canManage}
      />
    </WorkspaceShell>
  );
}
