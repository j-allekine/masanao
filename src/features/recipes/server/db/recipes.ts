import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { RecipeInput } from "../../schemas/recipe";
import type {
  RecipeCatalogItem,
  RecipeFieldErrors,
  RecipeIngredientOption,
} from "../../types";

const recipeCatalogSelect = {
  id: true,
  name: true,
  isActive: true,
  _count: { select: { ingredients: true } },
} as const;

export async function listActiveRecipeRecords(): Promise<RecipeCatalogItem[]> {
  const recipes = await prisma.recipe.findMany({
    where: { isActive: true },
    select: recipeCatalogSelect,
    orderBy: [{ normalizedName: "asc" }, { id: "asc" }],
  });

  return recipes.map(toRecipeCatalogItem);
}

function toRecipeCatalogItem(recipe: {
  id: string;
  name: string;
  isActive: boolean;
  _count: { ingredients: number };
}): RecipeCatalogItem {
  return {
    id: recipe.id,
    name: recipe.name,
    ingredientCount: recipe._count.ingredients,
    isActive: recipe.isActive,
  };
}

export async function listActiveRecipeIngredientOptions(): Promise<
  RecipeIngredientOption[]
> {
  const items = await prisma.item.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      baseUnit: { select: { id: true, name: true, abbreviation: true } },
    },
    orderBy: [{ normalizedName: "asc" }, { id: "asc" }],
  });

  return items;
}

export type RecipeCreateWriteResult =
  | { kind: "created"; recipe: RecipeCatalogItem }
  | { kind: "duplicate" }
  | { kind: "invalid-ingredients"; fields: RecipeFieldErrors };

export async function createRecipeWithActiveItems(
  input: RecipeInput,
): Promise<RecipeCreateWriteResult> {
  return prisma.$transaction(async (transaction) => {
    const activeItems = await transaction.item.findMany({
      where: {
        id: { in: input.ingredients.map((ingredient) => ingredient.itemId) },
        isActive: true,
      },
      select: { id: true },
    });

    const activeItemIds = new Set(activeItems.map((item) => item.id));
    const fields: RecipeFieldErrors = {};

    input.ingredients.forEach((ingredient, index) => {
      if (!activeItemIds.has(ingredient.itemId)) {
        fields[`ingredients.${index}.itemId`] = ["Select an active Item."];
      }
    });

    const conversionIds = input.ingredients.flatMap((ingredient) =>
      ingredient.itemUnitConversionId ? [ingredient.itemUnitConversionId] : [],
    );
    if (conversionIds.length) {
      const conversions = await transaction.itemUnitConversion.findMany({
        where: { id: { in: conversionIds } },
        select: { id: true, itemId: true },
      });
      const conversionItemIds = new Map(
        conversions.map((conversion) => [conversion.id, conversion.itemId]),
      );

      input.ingredients.forEach((ingredient, index) => {
        if (
          ingredient.itemUnitConversionId &&
          conversionItemIds.get(ingredient.itemUnitConversionId) !== ingredient.itemId
        ) {
          fields[`ingredients.${index}.itemUnitConversionId`] = [
            "Select an available Unit conversion for this Item.",
          ];
        }
      });
    }

    if (Object.keys(fields).length) {
      return { kind: "invalid-ingredients" as const, fields };
    }

    try {
      const recipe = await transaction.recipe.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          normalizedName: input.normalizedName,
          preparationNote: input.preparationNote,
          ingredients: {
            create: input.ingredients.map((ingredient) => ({
              id: crypto.randomUUID(),
              itemId: ingredient.itemId,
              enteredQuantity: ingredient.enteredQuantity,
              itemUnitConversionId: ingredient.itemUnitConversionId,
            })),
          },
        },
        select: recipeCatalogSelect,
      });

      return { kind: "created" as const, recipe: toRecipeCatalogItem(recipe) };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { kind: "duplicate" as const };
      }

      throw error;
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
