import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { RecipeCreateEditor } from "@/features/recipes/ui";
import {
  canManageRecipes as canManageRecipeTemplates,
  listActiveRecipeItems,
} from "@/features/recipes/server";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "New Recipe | Masanao",
  description: "Create a reusable municipal kitchen food template.",
};

export default async function NewRecipeRoute() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const actor = {
    id: session.user.id,
    name: session.user.name,
    username: session.user.username ?? null,
  };
  if (!(await canManageRecipeTemplates(actor))) redirect("/recipes");

  const items = await listActiveRecipeItems();

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="recipes"
    >
      <RecipeCreateEditor items={items} />
    </WorkspaceShell>
  );
}
