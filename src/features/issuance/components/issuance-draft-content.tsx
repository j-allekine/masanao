"use client";

import {
  useEffect,
  useState,
  useTransition,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldContent,
  FieldDescription,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyDescription } from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  listIssuanceRecipesAction,
  previewIssuanceRecipeAction,
  saveIssuanceDraftAction,
} from "../actions";
import { displayRational, recipeContribution } from "../domain/rational";
import type {
  IssuanceWorkspace,
  IssuanceRecipe,
  IssuanceRecipeOption,
} from "../types";

function pax(value: string) {
  return /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2147483647
    ? Number(value)
    : null;
}
type LocalRecipe = IssuanceRecipe & { unsaved?: boolean };

export default function IssuanceDraftContent({
  workspace,
}: {
  workspace: IssuanceWorkspace;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [saved, setSaved] = useState(workspace);
  const [mealPax, setMealPax] = useState(
    workspace.draft.mealPax?.toString() ?? "",
  );
  const [recipes, setRecipes] = useState<LocalRecipe[]>(
    workspace.draft.recipes,
  );
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const [picker, setPicker] = useState(false);
  const [options, setOptions] = useState<IssuanceRecipeOption[]>([]);
  const [query, setQuery] = useState("");
  const [pickerPax, setPickerPax] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [viewId, setViewId] = useState<string | null>(null);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustPax, setAdjustPax] = useState("");
  const [leaveUrl, setLeaveUrl] = useState<string | null>(null);
  const [discard, setDiscard] = useState<"leave" | "reset" | null>(null);
  const context = workspace.context;
  const backUrl = `/activity-designs/${context.activityDesignId}/activities/${context.activityId}/meal-schedules/${context.mealScheduleId}`;
  const view = recipes.find((recipe) => recipe.id === viewId);
  const adjust = recipes.find((recipe) => recipe.id === adjustId);
  const invalidMeal = mealPax !== "" && pax(mealPax) === null;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.href === window.location.href
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveUrl(anchor.href);
      setDiscard("leave");
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);

  function changeMeal(value: string) {
    setMealPax(value);
    setDirty(true);
    setNotice("");
    setRecipes((current) =>
      current.map((recipe) =>
        recipe.targetMode === "meal"
          ? { ...recipe, targetPax: pax(value) }
          : recipe,
      ),
    );
  }
  function openPicker() {
    setError("");
    setPickerPax(mealPax);
    setSelected([]);
    setQuery("");
    setPicker(true);
    startTransition(async () => {
      const result = await listIssuanceRecipesAction();
      if (result.ok) setOptions(result.value);
      else setError(result.error);
    });
  }
  function addRecipes() {
    const target = pax(pickerPax);
    if (!pax(mealPax) || !target) {
      setError(
        "Enter positive whole-number Meal pax and Recipe pax before adding Recipes.",
      );
      return;
    }
    startTransition(async () => {
      const results = await Promise.all(
        selected.map((id) => previewIssuanceRecipeAction(id)),
      );
      const failure = results.find((result) => !result.ok);
      if (failure && !failure.ok) {
        setError(failure.error);
        return;
      }
      const additions: LocalRecipe[] = results.flatMap((result) =>
        result.ok
          ? [
              {
                ...result.value,
                id: `new-${result.value.recipeId}`,
                targetMode:
                  target === pax(mealPax)
                    ? ("meal" as const)
                    : ("explicit" as const),
                targetPax: target,
                unsaved: true,
              },
            ]
          : [],
      );
      setRecipes((current) => [...current, ...additions]);
      setDirty(true);
      setNotice("");
      setPicker(false);
    });
  }
  function save() {
    if (invalidMeal) {
      setError(
        "Meal pax must be a positive whole number, or leave it blank while pending.",
      );
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await saveIssuanceDraftAction(
        {
          activityDesignId: context.activityDesignId,
          activityId: context.activityId,
          mealScheduleId: context.mealScheduleId,
        },
        {
          revision: saved.draft.revision,
          mealPax: pax(mealPax),
          recipes: recipes.map((recipe) => ({
            ...(recipe.unsaved
              ? {
                  recipeId: recipe.recipeId,
                  sourceRevision: recipe.sourceRevision,
                }
              : { snapshotId: recipe.id }),
            targetMode: recipe.targetMode,
            targetPax: recipe.targetPax,
          })),
        },
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(result.value);
      setRecipes(result.value.draft.recipes);
      setMealPax(result.value.draft.mealPax?.toString() ?? "");
      setDirty(false);
      setNotice("Draft saved. No stock has been issued.");
    });
  }
  function confirmDiscard() {
    if (discard === "leave") router.push(leaveUrl ?? backUrl);
    else {
      setRecipes(saved.draft.recipes);
      setMealPax(saved.draft.mealPax?.toString() ?? "");
      setDirty(false);
      setError("");
      setNotice("");
    }
    setDiscard(null);
    setLeaveUrl(null);
  }

  return (
    <div
      className="flex h-svh min-h-0 flex-col bg-card"
      data-issuance-ready={hydrated ? "true" : undefined}
    >
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <SidebarTrigger />
        <div className="min-w-0">
          <p className="text-heading-3 font-semibold">Issuance</p>
          <p className="truncate text-body-sm text-muted-foreground">
            {context.activityDesignNo} · {context.activityName}
          </p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-col gap-4 border-b px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="break-words text-heading-2 font-semibold">
                {context.mealLabel} · {context.mealTime}
              </h1>
              <p className="text-body-sm text-muted-foreground">
                {context.activityDesignTitle} / {context.activityName} / Meal
                Schedule
              </p>
            </div>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                dirty
                  ? (setLeaveUrl(null), setDiscard("leave"))
                  : router.push(backUrl)
              }
            >
              Back to Meal Schedule
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <FieldGroup className="w-32">
              <Field>
                <FieldLabel htmlFor="meal-pax">Meal pax</FieldLabel>
                <Input
                  id="meal-pax"
                  inputMode="numeric"
                  value={mealPax}
                  disabled={pending}
                  aria-invalid={invalidMeal}
                  aria-describedby="meal-pax-help"
                  onChange={(event) => changeMeal(event.target.value)}
                />
              </Field>
            </FieldGroup>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" disabled={pending} />}
              >
                <Plus aria-hidden="true" />
                Add
                <ChevronDown aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={openPicker}>
                    Recipe
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button disabled={pending || !dirty} onClick={save}>
              {pending ? "Working…" : "Save draft"}
            </Button>
            {dirty ? (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => setDiscard("reset")}
              >
                Discard changes
              </Button>
            ) : null}
          </div>
          <p id="meal-pax-help" className="text-body-sm text-muted-foreground">
            {pax(mealPax)
              ? "Recipes follow Meal pax unless their target is adjusted."
              : "Meal pax pending. Enter pax before adding Recipes."}
          </p>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {notice ? (
            <p role="status" className="text-body-sm">
              {notice}
            </p>
          ) : null}
        </div>
        <section
          aria-labelledby="recipes-heading"
          className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        >
          <h2
            id="recipes-heading"
            className="mb-3 text-heading-3 font-semibold"
          >
            Recipes
          </h2>
          {recipes.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyDescription>
                  No Recipes selected. Add a Recipe to prepare this draft.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y rounded-lg border">
              {recipes.map((recipe) => (
                <li
                  key={recipe.id}
                  className="flex min-w-0 items-center gap-2 px-3 py-3"
                >
                  <Button
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 justify-start whitespace-normal text-left"
                    onClick={() => setViewId(recipe.id)}
                  >
                    {recipe.recipeName}
                  </Button>
                  <span className="shrink-0 text-body-sm tabular-nums">
                    {recipe.targetPax === null
                      ? "Pax pending"
                      : `${recipe.targetPax} pax`}
                  </span>
                  <WorkspaceRowActionMenu
                    actionButtonId={`issuance-actions-${recipe.id}`}
                    ariaLabel={`Actions for ${recipe.recipeName}`}
                    disabled={pending}
                    groups={[
                      {
                        actions: [
                          {
                            label: "View ingredients",
                            onSelect: () => setViewId(recipe.id),
                          },
                          {
                            label: "Adjust target pax",
                            onSelect: () => {
                              setAdjustId(recipe.id);
                              setAdjustPax(recipe.targetPax?.toString() ?? "");
                            },
                          },
                          {
                            label: "Remove Recipe",
                            variant: "destructive",
                            onSelect: () => {
                              setRecipes((current) =>
                                current.filter((row) => row.id !== recipe.id),
                              );
                              setDirty(true);
                              setNotice("");
                            },
                          },
                        ],
                      },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Recipes</DialogTitle>
            <DialogDescription>
              Select Recipes for this meal. Ingredient quantities are copied
              when saved.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="picker-pax">Recipe pax</FieldLabel>
              <Input
                aria-invalid={pickerPax !== "" && !pax(pickerPax)}
                id="picker-pax"
                inputMode="numeric"
                value={pickerPax}
                onChange={(event) => setPickerPax(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="recipe-search">Search Recipes</FieldLabel>
              <Input
                id="recipe-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <FieldSet className="max-h-64 overflow-y-auto">
            <FieldLegend className="sr-only">
              Recipes available to add
            </FieldLegend>
            {options
              .filter((option) =>
                option.name
                  .toLocaleLowerCase()
                  .includes(query.toLocaleLowerCase()),
              )
              .map((option) => {
                const added = recipes.some(
                  (recipe) => recipe.recipeId === option.id,
                );
                return (
                  <Field
                    orientation="horizontal"
                    key={option.id}
                    className="flex gap-3 rounded-md border p-3"
                  >
                    <Checkbox
                      id={`recipe-${option.id}`}
                      disabled={!option.available || added || pending}
                      checked={selected.includes(option.id)}
                      onCheckedChange={(checked) =>
                        setSelected((current) =>
                          checked
                            ? [...current, option.id]
                            : current.filter((id) => id !== option.id),
                        )
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldLabel
                        htmlFor={`recipe-${option.id}`}
                        className="break-words"
                      >
                        {option.name}
                      </FieldLabel>
                      <FieldDescription>
                        {added
                          ? "Already selected"
                          : (option.reason ??
                            `Baseline ${option.baselinePax} pax`)}
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                );
              })}
          </FieldSet>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicker(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || selected.length === 0}
              onClick={addRecipes}
            >
              Add selected Recipes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Sheet
        open={Boolean(view)}
        onOpenChange={(open) => {
          if (!open) setViewId(null);
        }}
      >
        <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:w-[36rem] data-[side=right]:sm:max-w-none">
          <SheetHeader>
            <SheetTitle>{view?.recipeName}</SheetTitle>
            <SheetDescription>
              Baseline {view?.baselinePax} pax · To issue{" "}
              {view?.targetPax ?? "pending"} pax
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto px-4 pb-4">
            <WorkspaceTableFrame caption="Recipe ingredients: baseline and scaled quantities">
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="whitespace-normal">
                    Baseline ({view?.baselinePax} pax)
                  </TableHead>
                  <TableHead className="whitespace-normal">
                    To issue ({view?.targetPax ?? "pending"} pax)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view?.ingredients.map((ingredient) => {
                  const amount =
                    view.targetPax === null
                      ? null
                      : displayRational(
                          recipeContribution(
                            ingredient.enteredQuantity,
                            view.targetPax,
                            view.baselinePax,
                          ),
                        );
                  return (
                    <TableRow key={ingredient.id}>
                      <TableCell className="whitespace-normal">
                        {ingredient.itemName}
                      </TableCell>
                      <TableCell>
                        {ingredient.enteredQuantity}{" "}
                        {ingredient.selectedUnitAbbreviation}
                      </TableCell>
                      <TableCell>
                        {amount
                          ? `${amount.approximate ? "≈ " : ""}${amount.quantity} ${ingredient.selectedUnitAbbreviation}`
                          : "Pending"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </WorkspaceTableFrame>
            <p className="mt-3 text-body-sm text-muted-foreground">
              Approximate repeating decimals are shown to six places. Final
              combined Item quantities are determined at issuance review.
            </p>
          </div>
        </SheetContent>
      </Sheet>
      <Dialog
        open={Boolean(adjust)}
        onOpenChange={(open) => {
          if (!open) setAdjustId(null);
        }}
      >
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjust target pax</DialogTitle>
            <DialogDescription>
              {adjust?.recipeName}. This target applies only to this Recipe.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="adjust-pax">Target pax</FieldLabel>
              <Input
                aria-invalid={adjustPax !== "" && !pax(adjustPax)}
                id="adjust-pax"
                inputMode="numeric"
                value={adjustPax}
                onChange={(event) => setAdjustPax(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRecipes((current) =>
                  current.map((row) =>
                    row.id === adjustId
                      ? { ...row, targetMode: "meal", targetPax: pax(mealPax) }
                      : row,
                  ),
                );
                setDirty(true);
                setNotice("");
                setAdjustId(null);
              }}
            >
              Use Meal pax
            </Button>
            <Button
              disabled={!pax(adjustPax)}
              onClick={() => {
                setRecipes((current) =>
                  current.map((row) =>
                    row.id === adjustId
                      ? {
                          ...row,
                          targetMode: "explicit",
                          targetPax: pax(adjustPax),
                        }
                      : row,
                  ),
                );
                setDirty(true);
                setNotice("");
                setAdjustId(null);
              }}
            >
              Apply target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(discard)}
        onOpenChange={(open) => {
          if (!open) {
            setDiscard(null);
            setLeaveUrl(null);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your saved draft will remain available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDiscard(null);
                setLeaveUrl(null);
              }}
            >
              Keep editing
            </Button>
            <Button variant="destructive" onClick={confirmDiscard}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
