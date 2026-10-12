"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LockKeyhole, ChevronDown, Plus } from "lucide-react";
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
  getIssuanceReviewReferencesAction,
  listIssuanceRecipesAction,
  previewIssuanceRecipeAction,
  saveIssuanceDraftAction,
} from "../actions";
import QuantityReviewDialog from "./quantity-review-dialog";
import {
  calculateIssuanceReview,
  confirmationIsAdjustment,
  issuanceDemandSignatures,
} from "../domain/quantities";
import {
  decimalRational,
  finiteDecimal,
} from "../domain/rational";
import StockPicker, { type LocalStockItem } from "./stock-picker";
import { displayRational, recipeContribution } from "../domain/rational";
import type {
  IssuanceWorkspace,
  IssuanceRecipe,
  IssuanceRecipeOption,
  IssuanceDraft,
  IssuanceItemTotal,
  IssuanceReviewReference,
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
  const [stockItems, setStockItems] = useState<LocalStockItem[]>(
    workspace.draft.stockItems,
  );
  const [stockPicker, setStockPicker] = useState<{
    line: LocalStockItem | null;
  } | null>(null);
  const [itemTotals, setItemTotals] = useState<IssuanceItemTotal[]>(
    workspace.draft.itemTotals ?? [],
  );
  const [quantityReviews, setQuantityReviews] = useState<
    { itemId: string; finalQuantity: string }[]
  >([]);
  const [resetItemIds, setResetItemIds] = useState<string[]>([]);
  const [references, setReferences] = useState<IssuanceReviewReference[]>(
    workspace.reviewReferences,
  );
  const [reviewOpen, setReviewOpen] = useState(false);
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
  const browserBack = useRef(false);
  const allowBack = useRef(false);
  const context = workspace.context;
  const backUrl = `/activity-designs/${context.activityDesignId}/activities/${context.activityId}/meal-schedules/${context.mealScheduleId}`;
  const view = recipes.find((recipe) => recipe.id === viewId);
  const adjust = recipes.find((recipe) => recipe.id === adjustId);
  const invalidMeal = mealPax !== "" && pax(mealPax) === null;
  const localDraft: IssuanceDraft = {
    ...saved.draft,
    mealPax: pax(mealPax),
    recipes,
    stockItems,
    itemTotals,
  };
  const { review, reviewPending } = calculateIssuanceReview(
    localDraft,
    references,
  );
  async function refreshReferences(itemIds: string[]) {
    const result = await getIssuanceReviewReferencesAction([
      ...new Set(itemIds),
    ]);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setReferences((current) => [
      ...current.filter((entry) => !itemIds.includes(entry.itemId)),
      ...result.value,
    ]);
    return true;
  }
  function openReview() {
    startTransition(async () => {
      if (
        await refreshReferences([
          ...new Set([
            ...recipes.flatMap((recipe) =>
              recipe.ingredients.map((ingredient) => ingredient.itemId),
            ),
            ...stockItems.map((line) => line.itemId),
          ]),
        ])
      )
        setReviewOpen(true);
    });
  }
  const demandLockedItemIds = review
    .filter(
      (row) =>
        row.adjusted ||
        (saved.draft.itemTotals?.some(
          (entry) => entry.itemId === row.itemId && entry.adjusted,
        ) &&
          !resetItemIds.includes(row.itemId)),
    )
    .map((row) => row.itemId);
  function changeDemand(next: Partial<IssuanceDraft>) {
    const before = issuanceDemandSignatures(localDraft);
    const after = issuanceDemandSignatures({ ...localDraft, ...next });
    const locked = review.filter(
      (row) =>
        demandLockedItemIds.includes(row.itemId) &&
        before.get(row.itemId) !== after.get(row.itemId),
    );
    if (locked.length) {
      setError(
        `Reset the adjustment for ${locked.map((row) => row.itemName).join(", ")} in combined review before changing its demand.`,
      );
      return false;
    }
    setError("");
    setDirty(true);
    setNotice("");
    return true;
  }
  function confirmQuantity(itemId: string, enteredQuantity: string) {
    const finalQuantity = finiteDecimal(decimalRational(enteredQuantity))!;
    const row = review.find((entry) => entry.itemId === itemId)!;
    const adjusted = confirmationIsAdjustment(row, finalQuantity);
    setItemTotals((current) => [
      ...current.filter((entry) => entry.itemId !== itemId),
      {
        itemId,
        calculatedNumerator: row.calculatedNumerator,
        calculatedDenominator: row.calculatedDenominator,
        finalQuantity,
        adjusted,
      },
    ]);
    setQuantityReviews((current) => [
      ...current.filter((entry) => entry.itemId !== itemId),
      { itemId, finalQuantity },
    ]);
    setDirty(true);
    setNotice("");
    setError("");
  }
  function resetQuantity(itemId: string) {
    if (
      saved.draft.itemTotals?.some(
        (entry) => entry.itemId === itemId && entry.adjusted,
      )
    ) {
      setResetItemIds((current) => [...new Set([...current, itemId])]);
    }
    setItemTotals((current) =>
      current.filter((entry) => entry.itemId !== itemId),
    );
    setQuantityReviews((current) =>
      current.filter((entry) => entry.itemId !== itemId),
    );
    setDirty(true);
    setNotice("");
    setError("");
  }
  function applyTarget(
    targetMode: "meal" | "explicit",
    targetPax: number | null,
  ) {
    const next = recipes.map((row) =>
      row.id === adjustId ? { ...row, targetMode, targetPax } : row,
    );
    if (!changeDemand({ recipes: next })) return;
    setRecipes(next);
    setAdjustId(null);
  }

  useEffect(() => {
    if (dirty) return;
    const currentUrl = window.location.href;
    const skipSavedGuard = (event: PopStateEvent) => {
      // A saved draft no longer needs the extra same-page guard entry.
      // Skip it before Next handles Back, preserving the original destination.
      if (window.location.href !== currentUrl) return;
      event.stopImmediatePropagation();
      window.history.back();
    };
    window.addEventListener("popstate", skipSavedGuard, true);
    return () => window.removeEventListener("popstate", skipSavedGuard, true);
  }, [dirty]);

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
      browserBack.current = false;
      setLeaveUrl(anchor.href);
      setDiscard("leave");
    };
    const currentUrl = window.location.href;
    if (!window.history.state?.issuanceGuard)
      window.history.pushState(
        { ...window.history.state, issuanceGuard: true },
        "",
        currentUrl,
      );
    const back = (event: PopStateEvent) => {
      if (allowBack.current || event.state?.issuanceGuard) return;
      event.stopImmediatePropagation();
      browserBack.current = true;
      window.history.forward();
      setLeaveUrl(null);
      setDiscard("leave");
    };
    window.addEventListener("popstate", back, true);
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("popstate", back, true);
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);

  function changeMeal(value: string) {
    const next = recipes.map((recipe) =>
      recipe.targetMode === "meal"
        ? { ...recipe, targetPax: pax(value) }
        : recipe,
    );
    if (!changeDemand({ mealPax: pax(value), recipes: next })) return;
    setMealPax(value);
    setRecipes(next);
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
      if (
        !(await refreshReferences(
          additions.flatMap((recipe) =>
            recipe.ingredients.map((ingredient) => ingredient.itemId),
          ),
        ))
      )
        return;
      const next = [...recipes, ...additions];
      if (!changeDemand({ recipes: next })) return;
      setRecipes(next);
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
          quantityReviews,
          resetItemIds,
          mealPax: pax(mealPax),
          stockItems: stockItems.map((line) =>
            line.unsaved || line.changed
              ? {
                  ...(line.unsaved ? {} : { lineId: line.id }),
                  itemId: line.itemId,
                  conversionId: line.conversionId,
                  enteredQuantity: line.enteredQuantity,
                }
              : { lineId: line.id },
          ),
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
      setReferences(result.value.reviewReferences);
      setItemTotals(result.value.draft.itemTotals ?? []);
      setQuantityReviews([]);
      setResetItemIds([]);
      setRecipes(result.value.draft.recipes);
      setStockItems(result.value.draft.stockItems);
      setMealPax(result.value.draft.mealPax?.toString() ?? "");
      setDirty(false);
      setNotice("Draft saved. No stock has been issued.");
    });
  }
  function confirmDiscard() {
    if (discard === "leave") {
      setDirty(false);
      allowBack.current = true;
      router.push(browserBack.current ? backUrl : (leaveUrl ?? backUrl));
    } else {
      setItemTotals(saved.draft.itemTotals ?? []);
      setQuantityReviews([]);
      setResetItemIds([]);
      setRecipes(saved.draft.recipes);
      setStockItems(saved.draft.stockItems);
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
                  ? ((browserBack.current = false),
                    setLeaveUrl(null),
                    setDiscard("leave"))
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
                render={
                  <Button
                    id="issuance-add"
                    variant="outline"
                    disabled={pending}
                  />
                }
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
                  <DropdownMenuItem
                    onClick={() => setStockPicker({ line: null })}
                  >
                    Stock item
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              id="issuance-review"
              variant="outline"
              disabled={pending}
              onClick={openReview}
            >
              Review quantities and stock
            </Button>
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
              : "Meal pax pending. Enter pax before adding Recipes and before posting. Stock items can be added now."}
          </p>
          {review.some((row) => row.warning) ? (
            <Alert variant="destructive">
              <AlertTriangle aria-label="Quantity review needed" />
              <AlertDescription>
                Some combined Item quantities require confirmation.{" "}
                <Button variant="link" onClick={openReview}>
                  Review quantities
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {review.some((row) => row.adjusted) ? (
            <p className="flex items-start gap-2 text-body-sm">
              <LockKeyhole
                aria-label="Adjusted demand locked"
                className="size-4 shrink-0"
              />
              <span>
                Adjusted Item demand is locked. Reset its confirmation in{" "}
                <Button variant="link" onClick={openReview}>
                  combined review
                </Button>{" "}
                before changing affected Recipes, pax, or Stock items.
              </span>
            </p>
          ) : null}
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
                              const next = recipes.filter(
                                (row) => row.id !== recipe.id,
                              );
                              if (!changeDemand({ recipes: next })) return;
                              setRecipes(next);
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
          <section aria-labelledby="stock-heading" className="mt-6">
            <h2
              id="stock-heading"
              className="mb-3 text-heading-3 font-semibold"
            >
              Stock
            </h2>
            {stockItems.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyDescription>
                    No Stock items selected. Add a Stock item for direct
                    issuance.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y rounded-lg border">
                {stockItems.map((line) => (
                  <li
                    key={line.id}
                    className="flex min-w-0 items-center gap-2 px-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-body-sm font-medium">
                        {line.itemName}
                      </p>
                      <p className="break-words text-body-sm text-muted-foreground tabular-nums">
                        {line.enteredQuantity} {line.selectedUnitAbbreviation}
                        {line.conversionId
                          ? ` · 1 ${line.selectedUnitAbbreviation} = ${line.conversionFactor} ${line.baseUnitAbbreviation}`
                          : ""}
                      </p>
                    </div>
                    <WorkspaceRowActionMenu
                      actionButtonId={`stock-actions-${line.id}`}
                      ariaLabel={`Actions for Stock item ${line.itemName}`}
                      disabled={pending}
                      groups={[
                        {
                          actions: [
                            {
                              label: "Edit Stock item",
                              onSelect: () => setStockPicker({ line }),
                            },
                            {
                              label: "Remove Stock item",
                              variant: "destructive",
                              onSelect: () => {
                                const next = stockItems.filter(
                                  (row) => row.id !== line.id,
                                );
                                if (!changeDemand({ stockItems: next })) return;
                                setStockItems(next);
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
        </section>
      </main>
      {stockPicker ? (
        <StockPicker
          line={stockPicker.line}
          onClose={() => setStockPicker(null)}
          onApply={async (line) => {
            if (!(await refreshReferences([line.itemId]))) return;
            const next = stockPicker.line
              ? stockItems.map((row) => (row.id === line.id ? line : row))
              : [...stockItems, line];
            if (!changeDemand({ stockItems: next })) {
              setStockPicker(null);
              return;
            }
            setStockItems(next);
            setDirty(true);
            setNotice("");
            setError("");
            setStockPicker(null);
          }}
        />
      ) : null}
      {reviewOpen ? (
        <QuantityReviewDialog
          rows={review}
          pendingPax={reviewPending}
          demandLockedItemIds={demandLockedItemIds}
          pendingItemIds={recipes
            .filter((recipe) => recipe.targetPax === null)
            .flatMap((recipe) =>
              recipe.ingredients.map((ingredient) => ingredient.itemId),
            )}
          onClose={() => setReviewOpen(false)}
          onConfirm={confirmQuantity}
          onReset={resetQuantity}
        />
      ) : null}
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
                        {review.find((row) => row.itemId === ingredient.itemId)
                          ?.adjusted ? (
                          <p className="mt-1 text-body-sm text-muted-foreground">
                            Combined total adjusted. Contribution remains
                            calculated.{" "}
                            <Button
                              variant="link"
                              onClick={() => {
                                setViewId(null);
                                openReview();
                              }}
                            >
                              View combined review
                            </Button>
                          </p>
                        ) : null}
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
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => applyTarget("meal", pax(mealPax))}
            >
              Use Meal pax
            </Button>
            <Button
              disabled={!pax(adjustPax)}
              onClick={() => applyTarget("explicit", pax(adjustPax))}
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
