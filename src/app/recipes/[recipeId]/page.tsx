import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { getRecipeForActor } from "@/features/recipes/server";
import { RecipeDetailContent } from "@/features/recipes/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Recipe | Masanao",
  description: "Review a reusable municipal kitchen food template.",
};

export default async function RecipeDetailRoute(
  props: PageProps<"/recipes/[recipeId]">,
) {
  const [session, { recipeId }] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    props.params,
  ]);

  if (!session) redirect("/");

  const { recipe, canManageRecipes: canManageRecipeTemplates } = await getRecipeForActor(
    { id: session.user.id, name: session.user.name, username: session.user.username ?? null },
    recipeId,
  );
  if (!recipe) notFound();

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="recipes"
    >
      <RecipeDetailContent recipe={recipe} canManageRecipes={canManageRecipeTemplates} />
    </WorkspaceShell>
  );
}
