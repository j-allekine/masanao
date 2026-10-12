export type IssuanceContext = {
  activityDesignId: string;
  activityId: string;
  mealScheduleId: string;
};
export type IssuanceMealContext = IssuanceContext & {
  activityDesignNo: string; activityDesignTitle: string;
  activityName: string; mealLabel: string; mealTime: string;
  plannedPax: number | null;
};
export type IssuanceIngredient = {
  id: string; itemId: string; itemName: string; enteredQuantity: string;
  conversionFactor: string; selectedUnitId: string; selectedUnitName: string;
  selectedUnitAbbreviation: string; baseUnitId: string; baseUnitName: string; baseUnitAbbreviation: string;
};
export type IssuanceRecipe = {
  id: string; recipeId: string; recipeName: string; baselinePax: number;
  sourceRevision: string; targetMode: "meal" | "explicit"; targetPax: number | null;
  ingredients: IssuanceIngredient[];
};
export type IssuanceRecipeSource = Omit<IssuanceRecipe, "id" | "targetMode" | "targetPax">;
export type IssuanceStockItem = Omit<IssuanceIngredient, "id"> & { id: string; conversionId: string | null };
export type IssuanceStockItemOption = {
  id: string; name: string;
  baseUnit: { id: string; name: string; abbreviation: string };
  conversions: { id: string; factor: string; alternateUnit: { id: string; name: string; abbreviation: string } }[];
};
export type IssuanceDraft = {
  id: string | null; revision: number; status: "draft" | "posted";
  mealPax: number | null; recipes: IssuanceRecipe[]; stockItems: IssuanceStockItem[];
  itemTotals?: IssuanceItemTotal[];
};
export type IssuanceItemTotal = { itemId: string; calculatedNumerator: string; calculatedDenominator: string; finalQuantity: string; adjusted: boolean };
export type IssuanceQuantityPolicy = "whole-only" | "allow-decimals";
export type IssuanceReviewItem = IssuanceItemTotal & {
  itemName: string; baseUnitId: string; baseUnitName: string; baseUnitAbbreviation: string;
  calculatedQuantity: string; calculatedApproximate: boolean; automaticQuantity: string;
  policy: IssuanceQuantityPolicy; warning: "fractional" | "rounded-zero" | null;
  availableQuantity: string; shortage: boolean;
};
export type IssuanceReviewReference = { itemId: string; policy: IssuanceQuantityPolicy; availableQuantity: string };
export type IssuanceWorkspace = { context: IssuanceMealContext; draft: IssuanceDraft; review: IssuanceReviewItem[]; reviewPending: boolean; reviewReferences: IssuanceReviewReference[] };
export type IssuanceRecipeOption = { id: string; name: string; baselinePax: number | null; available: boolean; reason: string | null };
export type IssuanceErrorKind = "authentication" | "forbidden" | "not-found" | "validation" | "conflict" | "source-changed" | "busy" | "immutable";
export type IssuanceFailure = { ok: false; kind: IssuanceErrorKind; error: string; fields?: Record<string, string[]> };
export type IssuanceResult<T> = { ok: true; value: T } | IssuanceFailure;
