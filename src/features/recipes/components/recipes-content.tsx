import Link from "next/link";
import { BookOpen } from "lucide-react";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { buttonVariants } from "@/components/ui/button";
import ListEmptyState from "@/components/workspace/list-empty-state";
import WorkspaceLifecycleBadge from "@/components/workspace/lifecycle-badge";
import WorkspaceTableFrame from "@/components/workspace/table-frame";

import type { RecipeCatalogItem } from "../types";

export default function RecipesContent({
  recipes,
  canManageRecipes,
}: {
  recipes: RecipeCatalogItem[];
  canManageRecipes: boolean;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-card">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-8" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-heading-3 font-semibold">Recipes</p>
            <p className="truncate text-body-sm text-muted-foreground">
              Browse reusable food templates for the municipal kitchen.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-heading-1 font-semibold">Recipes</h1>
            <p className="text-body text-muted-foreground">
              Reusable food templates and their usual ingredients.
            </p>
          </div>
          {canManageRecipes ? (
            <Link id="new-recipe" href="/recipes/new" className={buttonVariants({ size: "sm" })}>
              Create Recipe
            </Link>
          ) : null}
        </div>

        {recipes.length === 0 ? (
          <ListEmptyState
            icon={<BookOpen aria-hidden="true" />}
            hasFilters={false}
            filteredState={{ title: "", description: "" }}
            emptyState={{
              title: "No Recipes yet.",
              description:
                "Recipes will appear here once the kitchen recipe library is configured.",
            }}
          />
        ) : (
          <WorkspaceTableFrame caption="Active Recipes" className="min-w-[32rem]">
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead scope="col">Recipe</TableHead>
                <TableHead scope="col" className="text-right">Ingredients</TableHead>
                <TableHead scope="col" className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((recipe) => (
                <TableRow key={recipe.id} data-recipe-id={recipe.id}>
                  <TableCell className="max-w-[40rem] whitespace-normal">
                    <span className="block break-words">{recipe.name}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {recipe.ingredientCount}
                  </TableCell>
                  <TableCell className="text-center">
                    <WorkspaceLifecycleBadge isActive={recipe.isActive} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </WorkspaceTableFrame>
        )}
      </main>
    </div>
  );
}
