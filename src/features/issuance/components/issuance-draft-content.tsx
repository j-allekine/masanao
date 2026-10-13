"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LockKeyhole, Plus } from "lucide-react";
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
  const [confirmation, setConfirmation] = useState<IssuanceWorkspace | null>(
    null,
  );
  const [dirty, setDirty] = useState(false);
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
  const [viewId, setViewId] = useState<string | null>(null);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustPax, setAdjustPax] = useState("");
  const [leaveUrl, setLeaveUrl] = useState<string | null>(null);
  const [discard, setDiscard] = useState<"leave" | "reset" | null>(null);
  const browserBack = useRef(false);
  const allowBack = useRef(false);
  const context = saved.context;
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
      if (allowBack.current) return;
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
      setDirty(true);
      setNotice("");
      setSelected([]);
      setPickerNotice(`${additions.length} ${additions.length === 1 ? "Recipe added" : "Recipes added"} to this draft. Keep searching or choose Done.`);
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
    setDirty(false);
    setNotice("Draft saved. No stock has been issued.");
    return result.value;
  }
  function save() {
    startTransition(async () => {
      await persistDraft();
    });
  }
  function preparePosting() {
    setError("");
    startTransition(async () => {
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
    });
  }
  function post() {
    if (!confirmation || pending) return;
    setError("");
    startTransition(async () => {
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
      setDirty(false);
      setConfirmation(null);
      setNotice("");
    });
  }
  function confirmDiscard() {
    if (discard === "leave") {
      setDirty(false);
      allowBack.current = true;
      if (browserBack.current) {
        // Back was restored to the extra guard entry. Skip both it and the
        // original issuance entry to resume the user's actual destination.
        window.history.go(-2);
      } else {
        router.push(leaveUrl ?? backUrl);
      }
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

  if (saved.draft.status === "posted") {
    return (
      <IssuancePostedContent
        workspace={saved}
        hydrated={hydrated}
        backUrl={backUrl}
      />
    );
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <FieldGroup className="max-w-sm">
              <PaxField id="meal-pax" label="Meal pax" value={mealPax} onChange={changeMeal} disabled={pending}
                description={mealPax === "" ? "Enter how many people this meal serves. You can add Stock items while pax is pending." : "Recipes follow Meal pax unless you set a custom target."} />
            </FieldGroup>
            <Badge variant={dirty ? "secondary" : "outline"}>{dirty ? "Unsaved changes" : saved.draft.id ? "Saved draft" : "New draft"}</Badge>
          </div>
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
                    onClick={() => setViewId(recipe.id)}
                  >
                    {recipe.recipeName}
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="stock-heading" className="text-heading-3 font-semibold">Stock <span className="text-muted-foreground">({stockItems.length})</span></h2>
              <Button id="issuance-add" variant="outline" disabled={pending} onClick={() => setStockPicker({ line: null })}><Plus data-icon="inline-start" />Add Stock item</Button>
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
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-card px-4 py-4 sm:px-6">
          <div className="text-body-sm text-muted-foreground">
            <p>{dirty ? "Save your changes before leaving." : "No stock has been issued."}</p>
            {!pax(mealPax) ? <p>Enter valid Meal pax before posting.</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {dirty ? <Button variant="ghost" disabled={pending} onClick={() => setDiscard("reset")}>Discard changes</Button> : null}
            <Button id="issuance-review" variant="outline" disabled={pending} onClick={openReview}>Review quantities and stock</Button>
            <Button disabled={pending || !dirty || invalidMeal} onClick={save}>{pending ? "Working…" : "Save draft"}</Button>
            <Button id="issuance-post" variant="outline" disabled={pending || !pax(mealPax) || (!recipes.length && !stockItems.length)} onClick={preparePosting}>Post issuance</Button>
          </div>
        </footer>
      </main>
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
          finalFocus={() => document.getElementById("issuance-post")}
          showCloseButton={!pending}
          className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl"
        >
          <DialogHeader>
            <DialogTitle>Post issuance?</DialogTitle>
            <DialogDescription>
              These exact final quantities will be deducted together. Stock and
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
          onClose={() => setStockPicker(null)}
          onApply={async (line, signal) => {
            if (!(await refreshReferences([line.itemId], signal))) return false;
            const next = stockPicker.line
              ? stockItems.map((row) => (row.id === line.id ? line : row))
              : [...stockItems, line];
            if (!changeDemand({ stockItems: next })) {
              setStockPicker(null);
              return false;
            }
            setStockItems(next);
            setDirty(true);
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
          dirty={dirty}
          error={error}
          notice={notice}
        />
      ) : null}
      <Dialog open={picker} onOpenChange={(open) => { if (!pending) setPicker(open); }}>
        <DialogContent finalFocus={() => document.getElementById("issuance-add-recipe")} showCloseButton={!pending} className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Recipes</DialogTitle>
            <DialogDescription>
              Search and select Recipes. Keep adding while viewing what is already in this draft.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field orientation="horizontal">
              <Checkbox id="custom-recipe-pax" checked={customPickerPax} disabled={pending} onCheckedChange={(checked) => setCustomPickerPax(Boolean(checked))} />
              <FieldContent><FieldLabel htmlFor="custom-recipe-pax">Use custom Recipe pax</FieldLabel><FieldDescription>{pax(mealPax) ? `Following Meal pax: ${pax(mealPax)} people` : "Enter valid Meal pax on the draft before adding Recipes."}</FieldDescription></FieldContent>
            </Field>
            {customPickerPax ? <PaxField id="picker-pax" label="Recipe pax" value={pickerPax} onChange={setPickerPax} disabled={pending} description="This target applies to the Recipes you add now." /> : null}
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
                      aria-label={option.name}
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
                      <FieldTitle className="break-words">
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
          {pending ? <p role="status" className="text-body-sm">Loading Recipes…</p> : <p className="text-body-sm text-muted-foreground">{selected.length} selected to add</p>}
          </section>
          <section aria-labelledby="already-added-recipes" className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
            <h3 id="already-added-recipes" className="font-semibold">Already added ({recipes.length})</h3>
            {recipes.length ? <ul aria-label="Already added Recipes" className="flex max-h-64 flex-col gap-3 overflow-y-auto">{recipes.map((recipe) => <li key={recipe.id} className="break-words text-body-sm"><p className="font-medium">{recipe.recipeName}</p><p className="text-muted-foreground">{recipe.targetPax ?? "Pending"} pax · {recipe.targetMode === "meal" ? "Following meal" : "Custom target"}</p></li>)}</ul> : <p className="text-body-sm text-muted-foreground">Recipes you add will appear here.</p>}
            <p className="text-body-sm text-muted-foreground">Added to the draft. Save draft to keep these changes.</p>
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
              {pending ? "Adding…" : `Add ${selected.length} ${selected.length === 1 ? "Recipe" : "Recipes"}`}
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
