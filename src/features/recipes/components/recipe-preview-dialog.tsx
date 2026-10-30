"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import WorkspaceLifecycleBadge from "@/components/workspace/lifecycle-badge";
import { Spinner } from "@/components/ui/spinner";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import WorkspaceTableFrame from "@/components/workspace/table-frame";

import type { RecipeDetailItem } from "../types";

export type RecipePreviewState =
  | { status: "closed" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; recipe: RecipeDetailItem };

function displayUnit(ingredient: RecipeDetailItem["ingredients"][number]) {
  const unit = ingredient.itemUnitConversion?.alternateUnit ?? ingredient.item.baseUnit;
  return `${unit.name} (${unit.abbreviation})`;
}

export default function RecipePreviewDialog({
  preview,
  onClose,
}: {
  preview: RecipePreviewState;
  onClose: () => void;
}) {
  const recipe = preview.status === "ready" ? preview.recipe : null;
  const title = recipe?.name ?? "Recipe preview";

  return (
    <Dialog open={preview.status !== "closed"} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="inspection" className="workspace-pane [&_[data-slot=dialog-close]]:size-10">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Read-only Recipe preview.</DialogDescription>
        </DialogHeader>

        {preview.status === "loading" ? (
          <div className="flex min-h-24 items-center justify-center" aria-live="polite">
            <Spinner aria-label="Loading Recipe preview" />
          </div>
        ) : null}

        {preview.status === "error" ? (
          <p className="text-body text-destructive" role="alert">
            {preview.error}
          </p>
        ) : null}

        {recipe ? (
          <div className="workspace-content min-w-0">
            <WorkspaceLifecycleBadge isActive={recipe.isActive} />
            {recipe.needsAttention ? <Alert className="my-3"><AlertTitle>Unavailable ingredients</AlertTitle><AlertDescription>Some Items or Units are inactive. Review the Recipe before using it for new work.</AlertDescription></Alert> : null}
            <section aria-labelledby="recipe-preview-ingredients" className="flex flex-col gap-3">
              <div>
                <h2 id="recipe-preview-ingredients" className="text-heading-3 font-semibold">
                  Ingredients
                </h2>
                <p className="text-body-sm text-muted-foreground">
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

            {recipe.preparationNote ? (
              <section aria-labelledby="recipe-preview-note" className="mt-5 flex flex-col gap-1">
                <h2 id="recipe-preview-note" className="text-body font-semibold">
                  Preparation note
                </h2>
                <p className="whitespace-pre-wrap break-words text-body-sm">
                  {recipe.preparationNote}
                </p>
              </section>
            ) : null}
          </div>
        ) : null}

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
