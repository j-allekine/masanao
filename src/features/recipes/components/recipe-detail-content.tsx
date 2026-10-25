import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { RecordDetails } from "@/components/workspace/record-details";
import WorkspaceHeader from "@/components/workspace/workspace-header";
import {
  Table,
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
  return (
    <div className="flex min-h-svh flex-col bg-card">
      <WorkspaceHeader title="Supply Operations" />

      <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-label font-medium uppercase tracking-label text-primary">Recipe</p>
            <h1 className="break-words text-heading-1 font-semibold">{recipe.name}</h1>
            <p className="text-body text-muted-foreground">
              Review the usual ingredients recorded for this food template.
            </p>
          </div>
          <Link
            href="/recipes"
            className={cn(buttonVariants({ variant: "outline" }), "self-start sm:self-auto")}
          >
            <ClipboardList data-icon="inline-start" aria-hidden="true" />
            Back to Recipes
          </Link>
          {canManageRecipes ? <RecipeLifecycleActions id={recipe.id} isActive={recipe.isActive} /> : null}
          {canManageRecipes && recipe.isActive ? <Link href={`/recipes/${recipe.id}/edit`} className={cn(buttonVariants({ variant: "outline" }), "self-start sm:self-auto")}>Edit Recipe</Link> : null}
        </div>

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
          <div className="overflow-x-auto rounded-lg border">
            <Table>
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
                    <TableCell className="break-words font-medium">
                      {ingredient.item.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ingredient.enteredQuantity}
                    </TableCell>
                    <TableCell className="break-words">{displayUnit(ingredient)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    </div>
  );
}
