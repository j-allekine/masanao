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
export type IssuanceDraft = {
  id: string | null; revision: number; status: "draft" | "posted";
  mealPax: number | null; recipes: IssuanceRecipe[];
};
export type IssuanceWorkspace = { context: IssuanceMealContext; draft: IssuanceDraft };
export type IssuanceRecipeOption = { id: string; name: string; baselinePax: number | null; available: boolean; reason: string | null };
export type IssuanceErrorKind = "authentication" | "forbidden" | "not-found" | "validation" | "conflict" | "source-changed" | "busy" | "immutable";
export type IssuanceFailure = { ok: false; kind: IssuanceErrorKind; error: string; fields?: Record<string, string[]> };
export type IssuanceResult<T> = { ok: true; value: T } | IssuanceFailure;
