"use client";

// Prototype question: In the future Meal Schedule issuance workspace, can one meal-level
// Pax to prepare drive compact Recipe lines, while ingredients live in a secondary side panel?
// Three variants are switchable through ?variant=A, B, or C.

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";
import WorkspaceTableFrame from "@/components/workspace/table-frame";

type RecipeId = "arroz-caldo" | "munggo-stew" | "banana" | "steamed-rice" | "vegetable-saute" | "chicken-adobo" | "fruit-cups";
type VariantKey = "A" | "B" | "C";

type Recipe = {
  id: RecipeId;
  name: string;
  standardYield: number;
  ingredients: Array<{ id: string; name: string; quantity: number; unit: string }>;
};

type IssuanceRecipe = {
  instanceId: string;
  recipeId: RecipeId;
  servingsOverride: string | null;
};

type IssuancePrototypeProps = {
  plannedPax: string;
  mealPax: string;
  issuanceRecipes: IssuanceRecipe[];
  onMealPaxChange: (pax: string) => void;
  onResetMealPax: () => void;
  onViewIngredients: (entry: IssuanceRecipe) => void;
  onOpenAdjustment: (entry: IssuanceRecipe) => void;
  onRemoveRecipe: (instanceId: string) => void;
};

const recipeCatalog: Record<RecipeId, Recipe> = {
  "arroz-caldo": {
    id: "arroz-caldo",
    name: "Chicken arroz caldo",
    standardYield: 100,
    ingredients: [
      { id: "rice", name: "Rice", quantity: 12, unit: "kg" },
      { id: "chicken", name: "Chicken", quantity: 16, unit: "kg" },
      { id: "ginger", name: "Ginger", quantity: 0.5, unit: "kg" },
      { id: "garlic", name: "Garlic", quantity: 0.3, unit: "kg" },
    ],
  },
  "munggo-stew": {
    id: "munggo-stew",
    name: "Munggo stew",
    standardYield: 60,
    ingredients: [
      { id: "munggo", name: "Mung beans", quantity: 8, unit: "kg" },
      { id: "squash", name: "Squash", quantity: 6, unit: "kg" },
      { id: "malunggay", name: "Malunggay leaves", quantity: 1.2, unit: "kg" },
      { id: "pork", name: "Pork", quantity: 5, unit: "kg" },
    ],
  },
  banana: {
    id: "banana",
    name: "Lakatan banana",
    standardYield: 100,
    ingredients: [{ id: "banana", name: "Lakatan banana", quantity: 100, unit: "pieces" }],
  },
  "steamed-rice": {
    id: "steamed-rice",
    name: "Steamed rice",
    standardYield: 100,
    ingredients: [{ id: "rice", name: "Rice", quantity: 10, unit: "kg" }],
  },
  "vegetable-saute": {
    id: "vegetable-saute",
    name: "Sautéed mixed vegetables",
    standardYield: 80,
    ingredients: [
      { id: "cabbage", name: "Cabbage", quantity: 5, unit: "kg" },
      { id: "carrots", name: "Carrots", quantity: 3, unit: "kg" },
      { id: "oil", name: "Cooking oil", quantity: 0.8, unit: "L" },
    ],
  },
  "chicken-adobo": {
    id: "chicken-adobo",
    name: "Chicken adobo",
    standardYield: 100,
    ingredients: [
      { id: "chicken", name: "Chicken", quantity: 18, unit: "kg" },
      { id: "soy-sauce", name: "Soy sauce", quantity: 2, unit: "L" },
      { id: "vinegar", name: "Vinegar", quantity: 1.5, unit: "L" },
    ],
  },
  "fruit-cups": {
    id: "fruit-cups",
    name: "Fresh fruit cups",
    standardYield: 50,
    ingredients: [
      { id: "papaya", name: "Papaya", quantity: 4, unit: "kg" },
      { id: "pineapple", name: "Pineapple", quantity: 3, unit: "kg" },
    ],
  },
};

const variantLabels: Record<VariantKey, string> = {
  A: "A · Issuance table",
  B: "B · Context rail",
  C: "C · Review list",
};

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(value);
}

function positiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getTargetServings(entry: IssuanceRecipe, mealPax: string) {
  return positiveNumber(entry.servingsOverride ?? mealPax);
}

function getScaleFactor(entry: IssuanceRecipe, mealPax: string) {
  const servings = getTargetServings(entry, mealPax);
  return servings ? servings / recipeCatalog[entry.recipeId].standardYield : null;
}

function RecipeStatus({ entry, mealPax, showUnit = true }: { entry: IssuanceRecipe; mealPax: string; showUnit?: boolean }) {
  const target = getTargetServings(entry, mealPax);

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-table font-medium tabular-nums">{target ? `${formatQuantity(target)}${showUnit ? " servings" : ""}` : "—"}</span>
      {entry.servingsOverride !== null ? <span className="text-label text-muted-foreground">Adjusted</span> : null}
    </div>
  );
}

function RecipeActions({
  entry,
  onViewIngredients,
  onAdjust,
  onRemove,
}: {
  entry: IssuanceRecipe;
  onViewIngredients: () => void;
  onAdjust: () => void;
  onRemove: () => void;
}) {
  const recipe = recipeCatalog[entry.recipeId];

  return (
    <WorkspaceRowActionMenu
      actionButtonId={`issuance-recipe-actions-${entry.instanceId}`}
      ariaLabel={`Actions for ${recipe.name}`}
      contentClassName="min-w-52"
      groups={[
        {
          actions: [
            { label: "View ingredients", icon: <Eye />, onSelect: onViewIngredients },
            { label: "Adjust servings", icon: <SlidersHorizontal />, onSelect: onAdjust },
          ],
        },
        {
          actions: [{ label: "Remove recipe", icon: <Trash2 />, onSelect: onRemove, variant: "destructive" }],
        },
      ]}
    />
  );
}

function PaxToPrepareControl({
  plannedPax,
  mealPax,
  onMealPaxChange,
  onResetMealPax,
}: Pick<IssuancePrototypeProps, "plannedPax" | "mealPax" | "onMealPaxChange" | "onResetMealPax">) {
  const validPax = positiveNumber(mealPax);
  const followsActivityPlan = mealPax === plannedPax;

  return (
    <FieldGroup className="w-auto gap-1">
      <Field data-invalid={validPax === null ? true : undefined}>
        <div className="flex items-center gap-2">
          <FieldLabel htmlFor="pax-to-prepare" className="shrink-0">Meal pax</FieldLabel>
          <Input
            id="pax-to-prepare"
            className="w-24 tabular-nums"
            inputMode="numeric"
            min="1"
            type="number"
            value={mealPax}
            aria-invalid={validPax === null}
            aria-describedby="meal-pax-description"
            onChange={(event) => onMealPaxChange(event.target.value)}
          />
          {!followsActivityPlan ? (
            <Button type="button" size="sm" variant="ghost" onClick={onResetMealPax}>
              <RotateCcw data-icon="inline-start" aria-hidden="true" />
              Reset
            </Button>
          ) : null}
        </div>
        <FieldDescription id="meal-pax-description">{validPax === null ? "Enter a number greater than zero." : followsActivityPlan ? "From the activity plan · Default for all recipes" : `Activity plan: ${plannedPax} pax · Default for all recipes`}</FieldDescription>
      </Field>
    </FieldGroup>
  );
}

function RecipePicker({
  availableRecipes,
  mealPax,
  onAddRecipe,
}: {
  availableRecipes: Recipe[];
  mealPax: string;
  onAddRecipe: (recipeId: RecipeId, pax: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [paxDraft, setPaxDraft] = useState(mealPax);
  const [query, setQuery] = useState("");
  const [pickerKey, setPickerKey] = useState(0);
  const [lastAddedRecipe, setLastAddedRecipe] = useState("");
  const availableIds = new Set(availableRecipes.map((recipe) => recipe.id));
  const recipes = [
    ...availableRecipes,
    ...(Object.values(recipeCatalog) as Recipe[]).filter((recipe) => !availableIds.has(recipe.id)),
  ];
  const recipeNames = recipes.map((recipe) => recipe.name);

  return (
    <div>
      <Combobox
        key={pickerKey}
        items={recipeNames}
        value={null}
        inputValue={query}
        open={open}
        autoHighlight
        onOpenChange={(nextOpen, details) => {
          if (!nextOpen && details.reason === "item-press") return;
          if (nextOpen && !open) setPaxDraft(mealPax);
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
        onInputValueChange={setQuery}
        onValueChange={(recipeName) => {
          const recipe = recipes.find((item) => item.name === recipeName);
          if (!recipe || !availableIds.has(recipe.id) || positiveNumber(paxDraft) === null) return;
          onAddRecipe(recipe.id, paxDraft);
          setLastAddedRecipe(recipe.name);
          setQuery("");
          setPickerKey((key) => key + 1);
          if (availableRecipes.length === 1) setOpen(false);
        }}
      >
        <ComboboxTrigger
          aria-label="Add recipe"
          disabled={availableRecipes.length === 0}
          render={<Button type="button" variant="outline" />}
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          {availableRecipes.length === 0 ? "All recipes added" : "Add recipe"}
        </ComboboxTrigger>
        <ComboboxContent className="w-[min(26rem,calc(100vw-2rem))] p-2">
          <FieldGroup className="p-2 pb-3">
            <Field data-invalid={positiveNumber(paxDraft) === null ? true : undefined}>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="add-recipe-pax">Pax for new recipes</FieldLabel>
                <Input id="add-recipe-pax" className="w-24 tabular-nums" type="number" min="1" inputMode="numeric" value={paxDraft} onChange={(event) => setPaxDraft(event.target.value)} aria-invalid={positiveNumber(paxDraft) === null} aria-describedby="add-recipe-pax-help" />
              </div>
              <FieldDescription id="add-recipe-pax-help">{positiveNumber(paxDraft) === null ? "Enter a number greater than zero to add recipes." : `Meal default: ${mealPax} pax. Existing recipes won't change.`}</FieldDescription>
            </Field>
          </FieldGroup>
          <Separator className="mb-2" />
          <ComboboxInput aria-label="Search recipes" autoFocus placeholder="Search recipes…" />
          <ComboboxEmpty>No recipes match that search.</ComboboxEmpty>
          <ComboboxList className="max-h-64">
            {(recipeName) => {
              const recipe = recipes.find((item) => item.name === recipeName);
              if (!recipe) return null;
              const alreadyAdded = !availableIds.has(recipe.id);
              return (
                <ComboboxItem key={recipe.id} value={recipeName} disabled={alreadyAdded || positiveNumber(paxDraft) === null}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">{recipe.name}</span>
                    <span className="text-label text-muted-foreground">Recipe yield: {recipe.standardYield} servings</span>
                  </span>
                  {alreadyAdded ? <span className="flex items-center gap-1 text-label text-muted-foreground"><Check aria-hidden="true" /> Added</span> : null}
                </ComboboxItem>
              );
            }}
          </ComboboxList>
          <div className="flex items-center justify-between gap-2 border-t px-2 pt-2">
            <p className="text-label text-muted-foreground">{availableRecipes.length} available</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </ComboboxContent>
      </Combobox>
      <p role="status" className="sr-only">{lastAddedRecipe ? `${lastAddedRecipe} added to this issuance.` : ""}</p>
    </div>
  );
}

function IssuanceTable({
  entries,
  mealPax,
  onViewIngredients,
  onAdjust,
  onRemove,
}: {
  entries: IssuanceRecipe[];
  mealPax: string;
  onViewIngredients: (entry: IssuanceRecipe) => void;
  onAdjust: (entry: IssuanceRecipe) => void;
  onRemove: (instanceId: string) => void;
}) {
  return (
    <WorkspaceTableFrame caption="Recipes in this issuance" className="table-fixed">
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col">Recipe</TableHead>
          <TableHead scope="col" className="w-24 text-right sm:w-32">Servings</TableHead>
          <TableHead scope="col" className="w-12 text-right"><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const recipe = recipeCatalog[entry.recipeId];
          return (
            <TableRow key={entry.instanceId}>
              <TableCell className="whitespace-normal py-4">
                <Button type="button" variant="link" className="h-auto justify-start whitespace-normal px-0 text-left font-medium" onClick={() => onViewIngredients(entry)}>
                  {recipe.name}
                </Button>
              </TableCell>
              <TableCell className="text-right"><RecipeStatus entry={entry} mealPax={mealPax} showUnit={false} /></TableCell>
              <TableCell className="text-right">
                <RecipeActions
                  entry={entry}
                  onViewIngredients={() => onViewIngredients(entry)}
                  onAdjust={() => onAdjust(entry)}
                  onRemove={() => onRemove(entry.instanceId)}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </WorkspaceTableFrame>
  );
}

function CompactRecipeList({
  entries,
  mealPax,
  onViewIngredients,
  onAdjust,
  onRemove,
}: {
  entries: IssuanceRecipe[];
  mealPax: string;
  onViewIngredients: (entry: IssuanceRecipe) => void;
  onAdjust: (entry: IssuanceRecipe) => void;
  onRemove: (instanceId: string) => void;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Recipes to issue</CardTitle>
          <Badge variant="secondary">{entries.length} {entries.length === 1 ? "recipe" : "recipes"}</Badge>
        </div>
        <CardDescription>Open a recipe to review its calculated ingredients.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {entries.map((entry) => {
          const recipe = recipeCatalog[entry.recipeId];
          return (
            <section key={entry.instanceId} className="flex flex-col gap-2 border-b px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6" aria-labelledby={`recipe-row-${entry.instanceId}`}>
              <div className="min-w-0">
                <Button type="button" id={`recipe-row-${entry.instanceId}`} variant="link" className="h-auto max-w-full justify-start truncate px-0 font-semibold" onClick={() => onViewIngredients(entry)}>
                    {recipe.name}
                </Button>
                <p className="text-label text-muted-foreground">Base recipe: {recipe.standardYield} servings</p>
              </div>
              <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:justify-end sm:gap-4">
                <RecipeStatus entry={entry} mealPax={mealPax} />
                <RecipeActions
                  entry={entry}
                  onViewIngredients={() => onViewIngredients(entry)}
                  onAdjust={() => onAdjust(entry)}
                  onRemove={() => onRemove(entry.instanceId)}
                />
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function VariantA(props: IssuancePrototypeProps) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3" aria-labelledby="issuance-recipes-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="issuance-recipes-heading" className="text-heading-3 font-semibold">Recipes <span className="ml-1 text-body-sm font-normal text-muted-foreground">({props.issuanceRecipes.length})</span></h2>
          <p className="text-label text-muted-foreground">Click a recipe to view ingredients</p>
        </div>
        <IssuanceTable
          entries={props.issuanceRecipes}
          mealPax={props.mealPax}
          onViewIngredients={props.onViewIngredients}
          onAdjust={props.onOpenAdjustment}
          onRemove={props.onRemoveRecipe}
        />
      </section>
    </div>
  );
}

export function VariantB(props: IssuancePrototypeProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
        <Card size="sm">
          <CardHeader><CardTitle>How quantities work</CardTitle></CardHeader>
          <CardContent className="text-body-sm text-muted-foreground">
            Recipes follow the meal target until you adjust one. Ingredients stay out of the worklist and open only when reviewed.
          </CardContent>
        </Card>
      </aside>
      <section className="flex flex-col gap-6" aria-labelledby="issuance-worklist-heading">
        <div>
          <p className="text-label font-medium uppercase tracking-label text-primary">Issuance worklist</p>
          <h2 id="issuance-worklist-heading" className="text-heading-2 font-semibold">Foods for lunch</h2>
        </div>
        <IssuanceTable
          entries={props.issuanceRecipes}
          mealPax={props.mealPax}
          onViewIngredients={props.onViewIngredients}
          onAdjust={props.onOpenAdjustment}
          onRemove={props.onRemoveRecipe}
        />
      </section>
    </div>
  );
}

export function VariantC(props: IssuancePrototypeProps) {
  return (
    <section aria-label="Recipes in this issuance" className="max-w-5xl">
      <CompactRecipeList
        entries={props.issuanceRecipes}
        mealPax={props.mealPax}
        onViewIngredients={props.onViewIngredients}
        onAdjust={props.onOpenAdjustment}
        onRemove={props.onRemoveRecipe}
      />
    </section>
  );
}

function IngredientsSheet({
  entry,
  mealPax,
  onClose,
}: {
  entry: IssuanceRecipe | null;
  mealPax: string;
  onClose: () => void;
}) {
  const recipe = entry ? recipeCatalog[entry.recipeId] : null;
  const target = entry ? getTargetServings(entry, mealPax) : null;
  const factor = entry ? getScaleFactor(entry, mealPax) : null;

  return (
    <Sheet open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      {entry && recipe ? (
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{recipe.name}</SheetTitle>
            <SheetDescription>
              Ingredients calculated for {target ? formatQuantity(target) : "—"} servings from a {recipe.standardYield}-serving Recipe.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <RecipeStatus entry={entry} mealPax={mealPax} />
              {factor ? <Badge variant="outline">{formatQuantity(factor)}× scale</Badge> : null}
            </div>
            <div className="rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead scope="col">Ingredient</TableHead>
                    <TableHead scope="col" className="text-right">To issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipe.ingredients.map((ingredient) => (
                    <TableRow key={ingredient.id}>
                      <TableCell className="break-words font-medium">{ingredient.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {factor ? `${formatQuantity(ingredient.quantity * factor)} ${ingredient.unit}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}

function PrototypeSwitcher({ variant, onChange }: { variant: VariantKey; onChange: (variant: VariantKey) => void }) {
  if (process.env.NODE_ENV === "production") return null;

  const keys = Object.keys(variantLabels) as VariantKey[];
  const currentIndex = keys.indexOf(variant);
  const previousVariant = keys[(currentIndex + keys.length - 1) % keys.length];
  const nextVariant = keys[(currentIndex + 1) % keys.length];

  return (
    <nav className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit items-center gap-1 rounded-full border bg-popover p-1 shadow-lg" aria-label="Prototype layouts">
      <Button type="button" size="icon-sm" variant="ghost" aria-label={`Show ${variantLabels[previousVariant]}`} onClick={() => onChange(previousVariant)}>
        <ArrowLeft aria-hidden="true" />
      </Button>
      <span className="min-w-40 px-2 text-center text-body-sm font-medium">{variantLabels[variant]}</span>
      <Button type="button" size="icon-sm" variant="ghost" aria-label={`Show ${variantLabels[nextVariant]}`} onClick={() => onChange(nextVariant)}>
        <ArrowRight aria-hidden="true" />
      </Button>
    </nav>
  );
}

export default function RecipeScalingPrototype() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedVariant = searchParams.get("variant");
  const variant: VariantKey = requestedVariant === "B" || requestedVariant === "C" ? requestedVariant : "A";

  const [plannedPax] = useState("180");
  const [mealPax, setMealPax] = useState("180");
  const [issuanceRecipes, setIssuanceRecipes] = useState<IssuanceRecipe[]>([
    { instanceId: "arroz-caldo-1", recipeId: "arroz-caldo", servingsOverride: null },
    { instanceId: "munggo-stew-1", recipeId: "munggo-stew", servingsOverride: null },
    { instanceId: "steamed-rice-1", recipeId: "steamed-rice", servingsOverride: null },
    { instanceId: "vegetable-saute-1", recipeId: "vegetable-saute", servingsOverride: null },
  ]);
  const [ingredientsEntryId, setIngredientsEntryId] = useState<string | null>(null);
  const [adjustingRecipeId, setAdjustingRecipeId] = useState<string | null>(null);
  const [servingsDraft, setServingsDraft] = useState("");

  const availableRecipes = useMemo(
    () => (Object.values(recipeCatalog) as Recipe[]).filter((recipe) => !issuanceRecipes.some((entry) => entry.recipeId === recipe.id)),
    [issuanceRecipes],
  );
  const ingredientsEntry = issuanceRecipes.find((entry) => entry.instanceId === ingredientsEntryId) ?? null;
  const adjustingRecipe = issuanceRecipes.find((entry) => entry.instanceId === adjustingRecipeId) ?? null;

  const setVariant = useCallback((nextVariant: VariantKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", nextVariant);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable=true]")) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const keys: VariantKey[] = ["A", "B", "C"];
      const currentIndex = keys.indexOf(variant);
      const nextIndex = event.key === "ArrowLeft"
        ? (currentIndex + keys.length - 1) % keys.length
        : (currentIndex + 1) % keys.length;
      setVariant(keys[nextIndex]);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setVariant, variant]);

  const addRecipe = (recipeId: RecipeId, pax: string) => {
    setIssuanceRecipes((entries) => [
      ...entries,
      { instanceId: `${recipeId}-${crypto.randomUUID()}`, recipeId, servingsOverride: positiveNumber(pax) === positiveNumber(mealPax) ? null : pax },
    ]);
  };

  const openAdjustment = (entry: IssuanceRecipe) => {
    setAdjustingRecipeId(entry.instanceId);
    setServingsDraft(entry.servingsOverride ?? mealPax);
  };

  const applyAdjustment = () => {
    if (!adjustingRecipe || !positiveNumber(servingsDraft)) return;
    setIssuanceRecipes((entries) => entries.map((entry) => (
      entry.instanceId === adjustingRecipe.instanceId ? { ...entry, servingsOverride: servingsDraft } : entry
    )));
    setAdjustingRecipeId(null);
  };

  const resetRecipeToMealPax = () => {
    if (!adjustingRecipe) return;
    setIssuanceRecipes((entries) => entries.map((entry) => (
      entry.instanceId === adjustingRecipe.instanceId ? { ...entry, servingsOverride: null } : entry
    )));
    setAdjustingRecipeId(null);
  };

  const sharedProps: IssuancePrototypeProps = {
    plannedPax,
    mealPax,
    issuanceRecipes,
    onMealPaxChange: setMealPax,
    onResetMealPax: () => setMealPax(plannedPax),
    onViewIngredients: (entry) => setIngredientsEntryId(entry.instanceId),
    onOpenAdjustment: openAdjustment,
    onRemoveRecipe: (instanceId) => setIssuanceRecipes((entries) => entries.filter((entry) => entry.instanceId !== instanceId)),
  };
  const adjustedRecipe = adjustingRecipe ? recipeCatalog[adjustingRecipe.recipeId] : null;

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-card">
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-8" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-heading-3 font-semibold">Activity planning</p>
          <p className="truncate text-body-sm text-muted-foreground">Barangay feeding / Lunch / Issuance</p>
        </div>
      </header>

      <div className="shrink-0 border-b bg-card">
        <div className="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 id="issuance-title" className="text-heading-1 font-semibold">Lunch issuance</h1>
            </div>
            <Badge variant="outline">Draft</Badge>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="w-full min-w-0 sm:w-96">
              <PaxToPrepareControl plannedPax={plannedPax} mealPax={mealPax} onMealPaxChange={setMealPax} onResetMealPax={() => setMealPax(plannedPax)} />
            </div>
            <RecipePicker availableRecipes={availableRecipes} mealPax={mealPax} onAddRecipe={addRecipe} />
          </div>
        </div>
      </div>

      <main aria-labelledby="issuance-title" className="mx-auto w-full max-w-[90rem] min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6">
        {variant === "A" ? <VariantA {...sharedProps} /> : null}
        {variant === "B" ? <VariantB {...sharedProps} /> : null}
        {variant === "C" ? <VariantC {...sharedProps} /> : null}
      </main>

      <IngredientsSheet entry={ingredientsEntry} mealPax={mealPax} onClose={() => setIngredientsEntryId(null)} />

      <Dialog open={adjustingRecipe !== null} onOpenChange={(open) => !open && setAdjustingRecipeId(null)}>
        {adjustingRecipe ? <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust {adjustedRecipe?.name ?? "recipe"}</DialogTitle>
            <DialogDescription>This changes this recipe only. The meal remains planned for {mealPax || "—"} pax.</DialogDescription>
          </DialogHeader>
          <FieldSet>
            <FieldGroup>
              <Field data-invalid={servingsDraft !== "" && positiveNumber(servingsDraft) === null ? true : undefined}>
                <FieldLabel htmlFor="recipe-servings">Servings to make</FieldLabel>
                <Input
                  id="recipe-servings"
                  inputMode="numeric"
                  min="1"
                  type="number"
                  value={servingsDraft}
                  aria-invalid={servingsDraft !== "" && positiveNumber(servingsDraft) === null}
                  onChange={(event) => setServingsDraft(event.target.value)}
                />
                <FieldDescription>Use this for an optional food, menu choice, or another exception.</FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
          <DialogFooter>
            {adjustingRecipe.servingsOverride !== null ? <Button type="button" variant="link" onClick={resetRecipeToMealPax}>Use meal pax</Button> : null}
            <Button type="button" variant="outline" onClick={() => setAdjustingRecipeId(null)}>Cancel</Button>
            <Button type="button" disabled={positiveNumber(servingsDraft) === null} onClick={applyAdjustment}>Apply servings</Button>
          </DialogFooter>
        </DialogContent> : null}
      </Dialog>

      <PrototypeSwitcher variant={variant} onChange={setVariant} />
    </div>
  );
}
