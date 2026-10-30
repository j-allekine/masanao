"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import WorkspaceLifecycleBadge from "@/components/workspace/lifecycle-badge";
import { WorkspaceContent } from "@/components/workspace/workspace-content";
import { WorkspaceRecordHeading, WorkspaceRecordBreadcrumbs } from "@/components/workspace/record-presentation";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import { recipeCatalogReturn, recipeEditorHref, recipeRecordHref } from "./recipe-return-context";

import { buttonVariants } from "@/components/ui/button";
import { RecordDetails } from "@/components/workspace/record-details";
import WorkspaceHeader from "@/components/workspace/workspace-header";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { RecipeDetailItem } from "../types";
import RecipeLifecycleActions from "./recipe-lifecycle-actions";

function displayUnit(ingredient: RecipeDetailItem["ingredients"][number]) {
  const unit = ingredient.itemUnitConversion?.alternateUnit ?? ingredient.item.baseUnit;
  return `${unit.name} (${unit.abbreviation})`;
}

export default function RecipeDetailContent({
  recipe,
  canManageRecipes,
}: {
  recipe: RecipeDetailItem;
  canManageRecipes: boolean;
}) {
  const searchParams = useSearchParams();
  const returnTo = recipeCatalogReturn(searchParams.get("returnTo"));
  const recordHref = recipeRecordHref(recipe.id, returnTo);
  return (
    <div className="flex min-h-svh flex-col bg-card">
      <WorkspaceHeader title="Supply Operations" />
      <WorkspaceContent>
        <WorkspaceRecordBreadcrumbs ancestors={[{ label: "Recipes", href: returnTo }]} currentLabel={recipe.name} />
        <WorkspaceRecordHeading title={recipe.name} status={<div className="mt-3"><WorkspaceLifecycleBadge isActive={recipe.isActive} /></div>} actions={<>
          {canManageRecipes && recipe.isActive ? <Link href={recipeEditorHref(recipe.id, recordHref)} className={cn(buttonVariants({ variant: "outline" }), "min-h-10 h-auto whitespace-normal lg:min-h-9")}>Edit Recipe</Link> : null}
          {canManageRecipes ? <RecipeLifecycleActions id={recipe.id} isActive={recipe.isActive} returnTo={returnTo} /> : null}
        </>} />
        {recipe.needsAttention ? <Alert><AlertTitle>Unavailable ingredients</AlertTitle><AlertDescription>Some Items or Units are inactive. Review the Recipe before using it for new work.</AlertDescription></Alert> : null}
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
          <WorkspaceTableFrame responsive caption="Recipe ingredients">
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
                    <TableCell data-primary className="break-words font-medium">
                      {ingredient.item.name}
                    </TableCell>
                    <TableCell data-label="Quantity" className="text-right tabular-nums">
                      {ingredient.enteredQuantity}
                    </TableCell>
                    <TableCell data-label="Unit" className="break-words">{displayUnit(ingredient)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </WorkspaceTableFrame>
        </section>
      </WorkspaceContent>
    </div>
  );
}
