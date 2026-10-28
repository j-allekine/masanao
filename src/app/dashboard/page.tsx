import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { KitchenDashboard } from "@/features/supply-operations/ui";
import { getKitchenDashboard } from "@/features/supply-operations/server";

export const metadata: Metadata = {
  title: "Dashboard | Masanao",
  description: "Activity budgets, issued supply costs and budget variance for the municipal kitchen.",
};

export default async function DashboardRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  const result = await getKitchenDashboard({ id: session.user.id, name: session.user.name, username: session.user.username ?? null }, await searchParams);
  return <KitchenDashboard result={result} user={{ name: session.user.name ?? session.user.username ?? "Municipal staff", username: session.user.username ?? "staff account" }} />;
}
