import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import { listInventory } from "@/features/supply-operations/server";
import { InventoryContent, OpeningStockPrototype } from "@/features/supply-operations/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = { title: "Inventory | Masanao", description: "Check available kitchen supplies and stock status." };

export default async function InventoryRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  const actor = { id: session.user.id, name: session.user.name ?? "Municipal staff", username: session.user.username ?? null };
  const result = await listInventory(actor);
  if (!result.ok) redirect("/");
  const params = await searchParams;
  const prototype = process.env.NODE_ENV === "development" && params.prototype === "opening-stock";
  return <WorkspaceShell user={{ name: actor.name, username: actor.username ?? "staff account" }} activeSection="inventory">{prototype ? <OpeningStockPrototype items={result.rows} /> : <InventoryContent items={result.rows} />}</WorkspaceShell>;
}
