import Link from "next/link";
import { BookOpen, ClipboardList } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
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

function displayUnit(ingredient: RecipeDetailItem["ingredients"][number]) {
  const unit = ingredient.itemUnitConversion?.alternateUnit ?? ingredient.item.baseUnit;
  return `${unit.name} (${unit.abbreviation})`;
}

export default function RecipeDetailContent({
  recipe,
}: {
  recipe: RecipeDetailItem;
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen aria-hidden="true" />
              Preparation note
            </CardTitle>
            <CardDescription>
              Practical context recorded with this reusable Recipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap break-words text-body">
              {recipe.preparationNote ?? "No preparation note recorded."}
            </p>
          </CardContent>
        </Card>

        <section aria-labelledby="recipe-ingredients-title" className="flex flex-col gap-3">
          <div>
            <h2 id="recipe-ingredients-title" className="text-heading-2 font-semibold">
              Ingredients
            </h2>
            <p className="text-body text-muted-foreground">
              Usual quantities for this Recipe. They are not issued quantities.
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
