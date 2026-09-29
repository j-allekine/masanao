export type RecipeCatalogItem = {
  id: string;
  name: string;
  ingredientCount: number;
  isActive: boolean;
  needsAttention?: boolean;
};

export type RecipeDetailItem = {
  id: string;
  name: string;
  preparationNote: string | null;
  isActive: boolean;
  ingredients: Array<{
    id: string;
    itemId: string;
    enteredQuantity: string;
    itemUnitConversionId: string | null;
    item: {
      name: string;
      baseUnit: {
        name: string;
        abbreviation: string;
      };
    };
    itemUnitConversion: {
      alternateUnit: {
        name: string;
        abbreviation: string;
      };
    } | null;
  }>;
};

export type RecipeIngredientOption = {
  id: string;
  name: string;
  baseUnit: {
    id: string;
    name: string;
    abbreviation: string;
  };
  unitConversions: RecipeIngredientUnitConversionOption[];
};

export type RecipeIngredientUnitConversionOption = {
  id: string;
  alternateUnit: {
    id: string;
    name: string;
    abbreviation: string;
  };
  baseUnitQuantity: string;
  label: string;
};

export type RecipeField = "name" | "preparationNote" | "ingredients";
export type RecipeIngredientField =
  | `ingredients.${number}.itemId`
  | `ingredients.${number}.quantity`
  | `ingredients.${number}.itemUnitConversionId`;
export type RecipeFieldErrors = Partial<
  Record<RecipeField | RecipeIngredientField | "form", string[]>
>;

export type RecipeCreateResult =
  | { ok: true; recipe: RecipeCatalogItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate" | "inactive";
      error: string;
      fields: RecipeFieldErrors;
    };

export type RecipeFormActionState =
  | { status: "success"; recipe: RecipeCatalogItem }
  | {
      status: "error";
      kind: "authentication" | "forbidden" | "validation" | "duplicate" | "inactive" | "server";
      error: string;
      fields: RecipeFieldErrors;
  };

export type RecipeLifecycleActionState =
  | { status: "success"; message: string }
  | { status: "error"; kind: "authentication" | "forbidden" | "not-found" | "server"; error: string };

export type RecipePreviewActionState =
  | { status: "success"; recipe: RecipeDetailItem }
  | { status: "error"; kind: "authentication" | "not-found" | "server"; error: string };
