import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { canManageItems, listItems } from "@/features/master-data/server";
import { ItemsContent } from "@/features/master-data/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Items | Masanao",
  description: "Browse the municipal kitchen supply catalog.",
};

export default async function ItemsRoute() {
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
  const [items, canManageItemsResult] = await Promise.all([
    listItems(),
    canManageItems(actor),
  ]);

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="items"
    >
      <ItemsContent
        items={items}
        canManageItems={canManageItemsResult}
      />
    </WorkspaceShell>
  );
}
