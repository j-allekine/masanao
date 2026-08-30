import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import OverviewPage from "./overview-page";

export const metadata: Metadata = {
  title: "Overview | Masanao",
  description: "A clear starting point for Masanao municipal operations.",
};

export default async function OverviewRoute() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <OverviewPage
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
    />
  );
}
