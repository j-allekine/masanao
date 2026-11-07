import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { RecordDetails } from "@/components/workspace/record-details";
import WorkspaceLayout, { WorkspaceRecordTitle, WorkspaceTaskHeader } from "@/components/workspace/workspace-layout";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { RecipeDetailItem } from "../types";
import RecipeLifecycleActions from "./recipe-lifecycle-actions";
import { getRecipeListStateFromRoute, getRecipeListUrl } from "./recipe-list-state";

function displayUnit(ingredient: RecipeDetailItem["ingredients"][number]) {
  const unit = ingredient.itemUnitConversion?.alternateUnit ?? ingredient.item.baseUnit;
  return `${unit.name} (${unit.abbreviation})`;
}

export default function RecipeDetailContent({
  recipe,
  canManageRecipes,
  searchParams,
}: {
  recipe: RecipeDetailItem;
  canManageRecipes: boolean;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const catalogState = getRecipeListStateFromRoute(searchParams);
  const catalogHref = getRecipeListUrl("/recipes", "", catalogState);

  return (
    <WorkspaceLayout
      workspaceTitle="Supply Operations"
      task={(
        <WorkspaceTaskHeader actions={<>
          <Link href={catalogHref} className={buttonVariants({ variant: "outline" })}>
            <ClipboardList data-icon="inline-start" aria-hidden="true" className="hidden sm:inline" />
            Back to Recipes
          </Link>
          {canManageRecipes && recipe.isActive ? (
            <Link href={getRecipeListUrl(`/recipes/${recipe.id}/edit`, "", catalogState)} className={buttonVariants({ variant: "outline" })}>
              Edit Recipe
            </Link>
          ) : null}
          {canManageRecipes ? <RecipeLifecycleActions id={recipe.id} isActive={recipe.isActive} catalogHref={catalogHref} /> : null}
        </>}>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-label font-medium uppercase tracking-label text-primary">Recipe</p>
            <WorkspaceRecordTitle title={recipe.name} />
          </div>
        </WorkspaceTaskHeader>
      )}
    >
      <div className="mx-auto flex w-full min-w-0 max-w-content flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <p className="text-body text-muted-foreground">
          Review the usual ingredients recorded for this food template.
        </p>

        <RecordDetails label="Preparation note" fields={recipe.preparationNote ? [
          { label: "Note", value: <span className="whitespace-pre-wrap">{recipe.preparationNote}</span> },
        ] : []} />

        <section aria-labelledby="recipe-ingredients-title" className="flex flex-col gap-3">
          <div>
            <h2 id="recipe-ingredients-title" className="text-heading-2 font-semibold">
              Ingredients
            </h2>
            <p className="text-body text-muted-foreground">
              {recipe.baselinePax === null ? "Baseline pax not set" : `Ingredients for ${recipe.baselinePax.toLocaleString()} pax`}. These are reference quantities, not issued quantities.
            </p>
          </div>
          <WorkspaceTableFrame caption="Recipe ingredients" className="min-w-[28rem]" stickyColumns>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead scope="col">Item</TableHead>
                  <TableHead scope="col" className="text-right">Quantity</TableHead>
                  <TableHead scope="col">Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipe.ingredients.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="whitespace-normal wrap-anywhere font-medium">
                      {ingredient.item.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ingredient.enteredQuantity}
                    </TableCell>
                    <TableCell className="whitespace-normal wrap-anywhere">{displayUnit(ingredient)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </WorkspaceTableFrame>
        </section>
      </div>
    </WorkspaceLayout>
  );
}
