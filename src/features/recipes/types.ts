export type RecipeCatalogItem = {
  id: string;
  name: string;
  ingredientCount: number;
  isActive: boolean;
};

export type RecipeDetailItem = {
  id: string;
  name: string;
  preparationNote: string | null;
  isActive: boolean;
  ingredients: Array<{
    id: string;
    enteredQuantity: string;
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
};

export type RecipeField = "name" | "preparationNote" | "ingredients";
export type RecipeFieldErrors = Partial<Record<RecipeField | "form", string[]>>;

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
