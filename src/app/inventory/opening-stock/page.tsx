import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import { getOpeningStockWorkspace } from "@/features/supply-operations/server";
import { OpeningStockContent } from "@/features/supply-operations/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = { title: "Opening Stock | Masanao" };
export default async function OpeningStockRoute() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  const actor = { id: session.user.id, name: session.user.name, username: session.user.username ?? null };
  const result = await getOpeningStockWorkspace(actor);
  if (!result.ok) redirect("/inventory");
  return <WorkspaceShell user={{ name: actor.name, username: actor.username ?? "staff account" }} activeSection="inventory"><OpeningStockContent workspace={result.value} /></WorkspaceShell>;
}
