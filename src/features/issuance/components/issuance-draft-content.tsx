"use client";

import {
  useRef,
  useState,
  useTransition,
  useSyncExternalStore,
} from "react";
import { AlertTriangle, LockKeyhole, Plus, X } from "lucide-react";
import { useUnsavedNavigation } from "@/components/workspace/navigation-guard";
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
  FieldTitle,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import PaxField from "./pax-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyDescription } from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import { MealScheduleHeader } from "@/features/activity-planning/ui";
import type { MealScheduleDetailItem } from "@/features/activity-planning/types";
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
  postIssuanceAction,
} from "../actions";
import IssuancePostedContent from "./issuance-posted-content";
import QuantityReviewDialog from "./quantity-review-dialog";
import {
  calculateIssuanceReview,
  confirmationIsAdjustment,
  issuanceDemandSignatures,
} from "../domain/quantities";
import { decimalRational, finiteDecimal } from "../domain/rational";
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

import { parseIssuancePax as pax } from "../domain/pax";
type LocalRecipe = IssuanceRecipe & { unsaved?: boolean };

export default function IssuanceDraftContent({
  workspace,
  mealSchedule,
}: {
  workspace: IssuanceWorkspace;
  mealSchedule: MealScheduleDetailItem;
}) {
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
  const [confirmation, setConfirmation] = useState<IssuanceWorkspace | null>(
    null,
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const [picker, setPicker] = useState(false);
  const [options, setOptions] = useState<IssuanceRecipeOption[]>([]);
  const [query, setQuery] = useState("");
  const [pickerPax, setPickerPax] = useState("");
  const [customPickerPax, setCustomPickerPax] = useState(false);
  const [pickerNotice, setPickerNotice] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const recipeCheckboxes = useRef(new Map<string, HTMLElement>());
  const [viewId, setViewId] = useState<string | null>(null);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustPax, setAdjustPax] = useState("");
  const [discard, setDiscard] = useState(false);
  const discardTitle = useRef<HTMLHeadingElement | null>(null);
  const context = saved.context;
  // Compare entered values, not mutation flags. Returning fields/lines to the
  // saved baseline clears dirty; saving in place establishes the next baseline.
  function draftValues(rawMealPax: string, draftRecipes: LocalRecipe[], draftStock: LocalStockItem[], totals: IssuanceItemTotal[]) {
    return JSON.stringify({
      mealPax: rawMealPax,
      recipes: draftRecipes.map(({ id, recipeId, sourceRevision, targetMode, targetPax }) => ({ id, recipeId, sourceRevision, targetMode, targetPax })),
      stock: draftStock.map(({ itemId, conversionId, enteredQuantity, conversionFactor }) => ({ itemId, conversionId, enteredQuantity, conversionFactor })),
      // Automatic totals are derived; explicit adjustments are entered work.
      totals: totals.filter(({ adjusted }) => adjusted).map(({ itemId, finalQuantity, adjusted }) => ({ itemId, finalQuantity, adjusted })).sort((a,b) => a.itemId.localeCompare(b.itemId)),
    });
  }
  const dirty = saved.draft.status !== "posted" && draftValues(mealPax, recipes, stockItems, itemTotals) !== draftValues(saved.draft.mealPax?.toString() ?? "", saved.draft.recipes, saved.draft.stockItems, saved.draft.itemTotals ?? []);
  const navigation = useUnsavedNavigation({dirty, pending});
  const view = recipes.find((recipe) => recipe.id === viewId);
  const adjust = recipes.find((recipe) => recipe.id === adjustId);
  const invalidMeal = mealPax !== "" && pax(mealPax) === null;
  const canSave = dirty && !invalidMeal && Boolean(saved.draft.id || recipes.length || stockItems.length);
  const localDraft: IssuanceDraft = {
    ...saved.draft,
    mealPax: pax(mealPax),
    recipes,
    stockItems,
    itemTotals,
  };
  const { review, reviewPending } =
    saved.draft.status === "posted"
      ? { review: saved.review, reviewPending: false }
      : calculateIssuanceReview(localDraft, references);
  async function refreshReferences(itemIds: string[], signal?: AbortSignal) {
    if (signal?.aborted) return false;
    const result = await getIssuanceReviewReferencesAction([
      ...new Set(itemIds),
    ]);
    // Server Actions may finish after the picker that requested them closes.
    if (signal?.aborted) return false;
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
    // Equal-to-automatic confirmations belong to the demand they reviewed.
    // True adjustments are protected by the lock above until explicitly reset.
    const changed = new Set(
      [...before.keys()].filter((itemId) => before.get(itemId) !== after.get(itemId)),
    );
    setQuantityReviews((current) => current.filter((entry) => !changed.has(entry.itemId)));
    setItemTotals((current) => current.filter((entry) => entry.adjusted || !changed.has(entry.itemId)));
    setError("");
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
    setCustomPickerPax(false);
    setPickerNotice("");
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
    const target = pax(customPickerPax ? pickerPax : mealPax);
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
      setNotice("");
      setSelected([]);
      setPickerNotice(`${additions.length} ${additions.length === 1 ? "Recipe added." : "Recipes added."}`);
    });
  }
  async function persistDraft() {
    if (invalidMeal) {
      setError(
        "Meal pax must be a positive whole number, or leave it blank while pending.",
      );
      return;
    }
    setError("");
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
    setNotice("Draft saved. No stock has been issued.");
    return result.value;
  }
  function save() {
    if (pending) return;
    startTransition(async () => {
      try { await persistDraft(); }
      catch { setError("The draft could not be saved. Check your connection and try again."); }
    });
  }
  function preparePosting() {
    if (pending) return;
    setError("");
    startTransition(async () => {
      try {
        const current = dirty ? await persistDraft() : saved;
        if (!current) return;
        if (
          !current.draft.id ||
          !current.draft.mealPax ||
          current.reviewPending ||
          !current.review.length
        ) {
          setError(
            "Save at least one supply line and enter positive Meal pax before posting.",
          );
          return;
        }
        if (current.review.some((row) => row.warning)) {
          setError(
            "Confirm the unresolved combined Item quantities in Review quantities and stock before posting.",
          );
          return;
        }
        setConfirmation(current);
      } catch { setError("The draft could not be prepared for posting. Check your connection and try again."); }
    });
  }
  function post() {
    if (!confirmation || pending) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await postIssuanceAction(
          {
            activityDesignId: context.activityDesignId,
            activityId: context.activityId,
            mealScheduleId: context.mealScheduleId,
          },
          { revision: confirmation.draft.revision },
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSaved(result.value);
        setConfirmation(null);
        setNotice("");
      } catch { setError("Posting could not be completed. Check your connection and try again."); }
    });
  }
  function resetToSaved() {
    setItemTotals(saved.draft.itemTotals ?? []);
    setQuantityReviews([]);
    setResetItemIds([]);
    setRecipes(saved.draft.recipes);
    setStockItems(saved.draft.stockItems);
    setMealPax(saved.draft.mealPax?.toString() ?? "");
    setError("");
    setNotice("");
  }
  function confirmDiscard() {
    if (pending) return;
    if (navigation.open) navigation.onDiscard();
    else {
      resetToSaved();
      setDiscard(false);
    }
  }

  if (saved.draft.status === "posted") {
    return (
      <IssuancePostedContent
        workspace={saved}
        hydrated={hydrated}
        mealSchedule={mealSchedule}
        focusAfterPosting={workspace.draft.status !== "posted"}
      />
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-card [overflow-wrap:anywhere] [&_button]:h-auto [&_button]:min-h-10 [&_button]:min-w-10 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:py-2 [&_[data-slot=input]]:min-h-10"
      data-issuance-ready={hydrated ? "true" : undefined}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="workspace-pane min-h-0 flex-1 overflow-y-auto" data-workspace-scroll="body">
        <div className="workspace-content mx-auto w-full max-w-[64rem]">
        <div className="flex shrink-0 flex-col gap-4 border-b py-4">
          <MealScheduleHeader mealSchedule={mealSchedule} ready={hydrated} disabled={pending}
            status={<Badge variant="secondary">{dirty ? "Unsaved changes" : saved.draft.id ? "Draft" : "New draft"}</Badge>} />
          <FieldGroup className="max-w-sm">
            <PaxField id="meal-pax" label="Meal pax" value={mealPax} onChange={changeMeal} disabled={pending}
              description={mealPax === "" ? "Required before adding Recipes or posting." : ""} />
          </FieldGroup>
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
          className="py-5"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="recipes-heading" className="text-heading-3 font-semibold">Recipes <span className="text-muted-foreground">({recipes.length})</span></h2>
            <Button id="issuance-add-recipe" variant="outline" disabled={pending} onClick={openPicker}><Plus data-icon="inline-start" />Add Recipes</Button>
          </div>
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
                    aria-label={`View ingredients for ${recipe.recipeName}`}
                    onClick={() => setViewId(recipe.id)}
                  >
                    <span className="flex min-w-0 flex-col gap-1"><span>{recipe.recipeName}</span><span className="text-muted-foreground">View ingredients</span></span>
                  </Button>
                  <div className="min-w-0 text-right text-body-sm tabular-nums">
                    <p>{recipe.targetPax === null ? "Pax pending" : `${recipe.targetPax} pax`}</p>
                    <p className="text-muted-foreground">{recipe.targetMode === "meal" ? "Following meal" : "Custom target"}</p>
                  </div>
                  <WorkspaceRowActionMenu
                    actionButtonId={`issuance-actions-${recipe.id}`}
                    ariaLabel={`Actions for ${recipe.recipeName}`}
                    disabled={pending}
                    groups={[
                      {
                        actions: [
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="stock-heading" className="text-heading-3 font-semibold">Stock <span className="text-muted-foreground">({stockItems.length})</span></h2>
              <Button id="issuance-add" variant="outline" disabled={pending} onClick={() => { setError(""); setStockPicker({ line: null }); }}><Plus data-icon="inline-start" />Add Stock item</Button>
            </div>
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
                              onSelect: () => { setError(""); setStockPicker({ line }); },
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
        <div className="flex flex-col items-start gap-2 pb-4 text-body-sm text-muted-foreground">
          <p>{dirty ? "Save your changes before leaving." : "No stock has been issued."}</p>
          {!pax(mealPax) ? <p>Enter valid Meal pax before posting.</p> : null}
          {!saved.draft.id && !recipes.length && !stockItems.length ? <p>Add a Recipe or Stock item before saving your first draft.</p> : null}
          {dirty ? <Button variant="ghost" disabled={pending} onClick={() => setDiscard(true)}>Discard changes</Button> : null}
        </div>
        </div>
        </div>
        <footer aria-label="Draft actions" className="workspace-pane shrink-0 overflow-y-hidden border-t bg-card py-3 [scrollbar-gutter:stable] [@media(max-height:360px)]:py-1">
          <div className="workspace-content mx-auto grid w-full max-w-[64rem] grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end [@media(max-height:360px)]:grid [@media(max-height:360px)]:grid-cols-3">
            <Button id="issuance-review" aria-label="Review quantities and stock" variant="outline" disabled={pending} onClick={openReview}><span className="sm:hidden [@media(max-height:360px)]:inline">Review</span><span className="hidden sm:inline [@media(max-height:360px)]:hidden">Review quantities and stock</span></Button>
            <Button aria-label={pending ? "Working…" : "Save draft"} variant="outline" disabled={pending || !canSave} onClick={save}><span className="sm:hidden [@media(max-height:360px)]:inline">{pending ? "Working…" : "Save"}</span><span className="hidden sm:inline [@media(max-height:360px)]:hidden">{pending ? "Working…" : "Save draft"}</span></Button>
            <Button id="issuance-post" aria-label="Post issuance" className="col-span-2 [@media(max-height:360px)]:col-span-1" disabled={pending || !pax(mealPax) || (!recipes.length && !stockItems.length)} onClick={preparePosting}><span className="hidden [@media(max-height:360px)]:inline">Post</span><span className="[@media(max-height:360px)]:hidden">Post issuance</span></Button>
          </div>
        </footer>
      </div>
      <Dialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!pending && !open) {
            setConfirmation(null);
            setError("");
          }
        }}
      >
        <DialogContent
          finalFocus={() => document.getElementById("issuance-post") ?? document.getElementById("posted-quantities")}
          showCloseButton={!pending}
          className="max-h-[calc(100svh-2rem)] overflow-y-auto [overflow-wrap:anywhere] [&_button]:h-auto [&_button]:min-h-10 [&_button]:min-w-10 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:py-2 [&_[data-slot=input]]:min-h-10 [&_[data-slot=select-trigger]]:min-h-10 sm:max-w-xl"
        >
          <DialogHeader className="pr-10">
            <DialogTitle>Post issuance?</DialogTitle>
            <DialogDescription>
              These exact final quantities will be deducted together using the oldest receipt stock first (FIFO). Stock and
              Item eligibility will be checked again when you confirm.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle aria-hidden="true" />
            <AlertDescription>
              Posting is final. No correction, reversal, return, or replacement
              posting is available in this release.
            </AlertDescription>
          </Alert>
          <ul
            className="flex flex-col gap-3"
            aria-label="Final quantities to issue"
          >
            {confirmation?.review.map((row) => (
              <li
                key={row.itemId}
                className="flex flex-wrap justify-between gap-2 border-b pb-2"
              >
                <span className="min-w-0 break-words">{row.itemName}</span>
                <strong className="break-all tabular-nums">
                  {row.finalQuantity} {row.baseUnitAbbreviation}
                </strong>
              </li>
            ))}
          </ul>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                setConfirmation(null);
                setError("");
              }}
            >
              Keep draft
            </Button>
            <Button disabled={pending} onClick={post}>
              {pending ? "Posting…" : "Confirm and post issuance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {stockPicker ? (
        <StockPicker
          line={stockPicker.line}
          addedItems={stockItems}
          submissionError={error}
          onClose={() => setStockPicker(null)}
          onApply={async (line, signal) => {
            setError("");
            if (!(await refreshReferences([line.itemId], signal))) return false;
            const next = stockPicker.line
              ? stockItems.map((row) => (row.id === line.id ? line : row))
              : [...stockItems, line];
            if (!changeDemand({ stockItems: next })) {
              setStockPicker(null);
              return false;
            }
            setStockItems(next);
            setNotice("");
            setError("");
            if (stockPicker.line) setStockPicker(null);
            return true;
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
          onSave={save}
          saving={pending}
          canSave={canSave}
          error={error}
          notice={notice}
        />
      ) : null}
      <Dialog open={picker} onOpenChange={(open) => { if (!pending) setPicker(open); }}>
        <DialogContent finalFocus={() => document.getElementById("issuance-add-recipe")} showCloseButton={!pending} className="max-h-[calc(100svh-2rem)] overflow-y-auto [overflow-wrap:anywhere] [&_button]:h-auto [&_button]:min-h-10 [&_button]:min-w-10 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:py-2 [&_[data-slot=input]]:min-h-10 [&_[data-slot=select-trigger]]:min-h-10 sm:max-w-3xl">
          <DialogHeader className="pr-10">
            <DialogTitle>Add Recipes</DialogTitle>
            <DialogDescription className="sr-only">
              Choose Recipes for this meal.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <PaxField id="recipe-meal-pax" label="Meal pax" value={mealPax} onChange={changeMeal} disabled={pending}
              description="" />
            <Field orientation="horizontal">
              <Checkbox id="custom-recipe-pax" checked={customPickerPax} disabled={pending} onCheckedChange={(checked) => setCustomPickerPax(Boolean(checked))} />
              <FieldContent><FieldLabel htmlFor="custom-recipe-pax">Use custom Recipe pax</FieldLabel>{!pax(mealPax) ? <FieldDescription>Enter Meal pax above to enable adding Recipes.</FieldDescription> : null}</FieldContent>
            </Field>
            {customPickerPax ? <PaxField id="picker-pax" label="Recipe pax" value={pickerPax} onChange={setPickerPax} disabled={pending} description="" /> : null}
          </FieldGroup>
          <div className="grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <section aria-label="Find Recipes" className="flex min-w-0 flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="recipe-search">Search Recipes</FieldLabel>
              <Input
                id="recipe-search"
                value={query}
                disabled={pending}
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
                  <FieldLabel key={option.id} htmlFor={`recipe-${option.id}`} className="cursor-pointer">
                  <Field orientation="horizontal" data-disabled={!option.available || added || pending}>
                    <Checkbox
                      id={`recipe-${option.id}`}
                      ref={(element) => { if (element) recipeCheckboxes.current.set(option.id, element); else recipeCheckboxes.current.delete(option.id); }}
                      aria-labelledby={`recipe-name-${option.id}`}
                      aria-describedby={`recipe-reason-${option.id}`}
                      disabled={!option.available || added || pending}
                      checked={selected.includes(option.id)}
                      onCheckedChange={(checked) =>
                        setSelected((current) =>
                          checked
                            ? [...new Set([...current, option.id])]
                            : current.filter((id) => id !== option.id),
                        )
                      }
                    />
                    <FieldContent className="min-w-0">
                      <FieldTitle id={`recipe-name-${option.id}`} className="break-words">
                        {option.name}
                      </FieldTitle>
                      <FieldDescription id={`recipe-reason-${option.id}`}>
                        {added
                          ? "Already selected"
                          : (option.reason ??
                            `Baseline ${option.baselinePax} pax`)}
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                  </FieldLabel>
                );
              })}
          </FieldSet>
          {!pending && !options.some((option) => option.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) ? <Empty><EmptyHeader><EmptyDescription>No Recipes match your search.</EmptyDescription></EmptyHeader></Empty> : null}
          {pending ? <p role="status" className="text-body-sm">Loading Recipes…</p> : null}
          </section>
          <section aria-labelledby="already-added-recipes" className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
            {selected.length ? <section aria-label="Selected Recipes" className="flex flex-col gap-2">
              <h3 className="font-semibold">Selected to add ({selected.length})</h3>
              <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">{selected.map((id) => {
                const option = options.find((entry) => entry.id === id);
                return <li key={id} className="flex min-w-0 items-center justify-between gap-2 rounded-md border p-2">
                  <div className="min-w-0"><p className="break-words font-medium">{option?.name}</p><p className="text-muted-foreground">{pax(customPickerPax ? pickerPax : mealPax) ?? "Pending"} pax</p></div>
                  <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={`Remove selection ${option?.name}`} onClick={() => { setSelected((current) => current.filter((entry) => entry !== id)); recipeCheckboxes.current.get(id)?.focus(); }}><X /></Button>
                </li>;
              })}</ul>
            </section> : null}
            <h3 id="already-added-recipes" className="font-semibold">Already added ({recipes.length})</h3>
            {recipes.length ? <ul aria-label="Already added Recipes" className="flex max-h-48 flex-col divide-y overflow-y-auto">{recipes.map((recipe) => <li key={recipe.id} className="flex min-w-0 flex-wrap justify-between gap-2 py-2 text-body-sm"><p className="min-w-0 break-words font-medium">{recipe.recipeName}</p><p className="text-muted-foreground tabular-nums">{recipe.targetPax ?? "Pending"} pax</p></li>)}</ul> : <p className="text-body-sm text-muted-foreground">None yet.</p>}
          </section>
          </div>
          {pickerNotice ? <p role="status" className="text-body-sm">{pickerNotice}</p> : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setPicker(false)}>
              Done
            </Button>
            <Button
              disabled={pending || selected.length === 0 || !pax(mealPax) || !pax(customPickerPax ? pickerPax : mealPax)}
              onClick={addRecipes}
            >
              {pending ? "Adding…" : selected.length ? `Add ${selected.length} ${selected.length === 1 ? "Recipe" : "Recipes"}` : "Add Recipes"}
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
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto [overflow-wrap:anywhere] [&_button]:h-auto [&_button]:min-h-10 [&_button]:min-w-10 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:py-2 [&_[data-slot=input]]:min-h-10 [&_[data-slot=select-trigger]]:min-h-10">
          <DialogHeader className="pr-10">
            <DialogTitle>Adjust target pax</DialogTitle>
            <DialogDescription>
              {adjust?.recipeName}. This target applies only to this Recipe.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <PaxField id="adjust-pax" label="Target pax" value={adjustPax} onChange={setAdjustPax} disabled={pending} />
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
        open={discard || navigation.open}
        onOpenChange={(open) => {
          if (!pending && !open) {
            setDiscard(false);
            navigation.onStay();
          }
        }}
      >
        <DialogContent initialFocus={() => discardTitle.current} showCloseButton={!pending} className="max-h-[calc(100svh-2rem)] overflow-y-auto [overflow-wrap:anywhere] [&_button]:h-auto [&_button]:min-h-10 [&_button]:min-w-10 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:py-2 [&_[data-slot=input]]:min-h-10 [&_[data-slot=select-trigger]]:min-h-10">
          <DialogHeader className="pr-10">
            <DialogTitle ref={discardTitle} tabIndex={-1}>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your saved draft will remain available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                setDiscard(false);
                navigation.onStay();
              }}
            >
              Keep editing
            </Button>
            <Button variant="destructive" disabled={pending} onClick={confirmDiscard}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
