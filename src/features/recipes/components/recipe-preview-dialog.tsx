"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <DialogContent className="sm:max-w-2xl">
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
          <div className="max-h-[min(32rem,calc(100vh-13rem))] overflow-y-auto pr-1">
            <section aria-labelledby="recipe-preview-ingredients" className="flex flex-col gap-3">
              <div>
                <h2 id="recipe-preview-ingredients" className="text-heading-3 font-semibold">
                  Ingredients
                </h2>
                <p className="text-body-sm text-muted-foreground">
                  Usual quantities only. They are not issued quantities.
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

            {recipe.preparationNote ? (
              <section aria-labelledby="recipe-preview-note" className="mt-5 flex flex-col gap-1">
                <h2 id="recipe-preview-note" className="text-heading-3 font-semibold">
                  Preparation note
                </h2>
                <p className="whitespace-pre-wrap break-words text-body">
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
