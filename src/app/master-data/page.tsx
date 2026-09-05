import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { MasterDataContent } from "@/features/master-data/ui";
import {
  canManageCategories,
  canManageUnits,
  listCategories,
  listUnits,
} from "@/features/master-data/server";
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
  const [units, categories, canManageUnitsResult, canManageCategoriesResult, rawSearchParams] =
    await Promise.all([
    listUnits(),
    listCategories(),
    canManageUnits(actor),
    canManageCategories(actor),
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
        categories={categories}
        initialQuery={initialQuery}
        canManageUnits={canManageUnitsResult}
        canManageCategories={canManageCategoriesResult}
      />
    </WorkspaceShell>
  );
}
