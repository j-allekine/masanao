import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import { listInventory } from "@/features/supply-operations/server";
import { InventoryContent } from "@/features/supply-operations/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = { title: "Inventory | Masanao", description: "Check available kitchen supplies and stock status." };

export default async function InventoryRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  const actor = { id: session.user.id, name: session.user.name ?? "Municipal staff", username: session.user.username ?? null };
  const result = await listInventory(actor);
  if (!result.ok) redirect("/");
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, entry);
  }
  return <WorkspaceShell user={{ name: actor.name, username: actor.username ?? "staff account" }} activeSection="inventory"><InventoryContent items={result.rows} initialQuery={query.toString()} /></WorkspaceShell>;
}
