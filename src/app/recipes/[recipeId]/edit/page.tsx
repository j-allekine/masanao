import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import { RecipeCreateEditor } from "@/features/recipes/ui";
import { canManageRecipes, getActiveRecipe, listActiveRecipeItems } from "@/features/recipes/server";
import { auth } from "@/server/auth";

export default async function EditRecipeRoute(props: PageProps<"/recipes/[recipeId]/edit">) {
  const [session, { recipeId }] = await Promise.all([auth.api.getSession({ headers: await headers() }), props.params]);
  if (!session) redirect("/");
  const actor = { id: session.user.id, name: session.user.name, username: session.user.username ?? null };
  if (!(await canManageRecipes(actor))) redirect(`/recipes/${recipeId}`);
  const [recipe, items] = await Promise.all([getActiveRecipe(recipeId), listActiveRecipeItems()]);
  if (!recipe) notFound();
  return <WorkspaceShell user={{ name: session.user.name ?? session.user.username ?? "Municipal staff", username: session.user.username ?? "staff account" }} activeSection="recipes"><RecipeCreateEditor items={items} recipe={recipe} /></WorkspaceShell>;
}
