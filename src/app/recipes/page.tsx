import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { listActiveRecipes } from "@/features/recipes/server";
import { RecipesContent } from "@/features/recipes/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Recipes | Masanao",
  description: "Browse reusable municipal kitchen food templates.",
};

export default async function RecipesRoute() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const recipes = await listActiveRecipes();

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="recipes"
    >
      <RecipesContent recipes={recipes} />
    </WorkspaceShell>
  );
}
