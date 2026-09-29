import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { RecipeInput } from "../../schemas/recipe";
import type {
  RecipeCatalogItem,
  RecipeDetailItem,
  RecipeFieldErrors,
  RecipeIngredientOption,
} from "../../types";
import { sortItemUnitConversions } from "@/features/supply-operations/domain/item-unit-conversion";

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

export async function getActiveRecipeRecord(
  id: string,
): Promise<RecipeDetailItem | null> {
  return prisma.recipe.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      preparationNote: true,
      isActive: true,
      ingredients: {
        select: {
          id: true,
          enteredQuantity: true,
          item: {
            select: {
              name: true,
              baseUnit: { select: { name: true, abbreviation: true } },
            },
          },
          itemUnitConversion: {
            select: {
              alternateUnit: { select: { name: true, abbreviation: true } },
            },
          },
        },
        orderBy: [{ item: { normalizedName: "asc" } }, { id: "asc" }],
      },
    },
  });
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
      unitConversions: {
        where: { alternateUnit: { active: true } },
        select: {
          id: true,
          baseUnitQuantity: true,
          alternateUnit: { select: { id: true, name: true, abbreviation: true, active: true } },
        },
        orderBy: [{ alternateUnit: { normalizedName: "asc" } }, { id: "asc" }],
      },
    },
    orderBy: [{ normalizedName: "asc" }, { id: "asc" }],
  });

  return items.map((item) => ({
    ...item,
    unitConversions: sortItemUnitConversions(
      item.unitConversions.map((conversion) => ({
        ...conversion,
        label: `${conversion.alternateUnit.name} (${conversion.baseUnitQuantity} ${item.baseUnit.abbreviation})`,
      })),
    ),
  }));
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
      select: { id: true, baseUnitId: true },
    });

    const itemById = new Map(activeItems.map((item) => [item.id, item]));
    const fields: RecipeFieldErrors = {};
    input.ingredients.forEach((ingredient, index) => {
      if (!itemById.has(ingredient.itemId)) {
        fields[`ingredients.${index}.itemId`] = ["Select an active Item."];
      }
    });
    const conversionIds = input.ingredients.flatMap((ingredient) =>
      ingredient.itemUnitConversionId ? [ingredient.itemUnitConversionId] : [],
    );
    const conversions = conversionIds.length
      ? await transaction.itemUnitConversion.findMany({
          where: {
            id: { in: conversionIds },
            alternateUnit: { active: true },
          },
          select: { id: true, itemId: true, alternateUnitId: true, baseUnitQuantity: true },
        })
      : [];
    const conversionById = new Map(conversions.map((conversion) => [conversion.id, conversion]));

    for (const ingredient of input.ingredients) {
      if (!ingredient.itemUnitConversionId) continue;

      const item = itemById.get(ingredient.itemId);
      const conversion = conversionById.get(ingredient.itemUnitConversionId);
      if (
        !item ||
        !conversion ||
        conversion.itemId !== item.id ||
        conversion.alternateUnitId === item.baseUnitId
      ) {
        fields[`ingredients.${input.ingredients.indexOf(ingredient)}.itemUnitConversionId`] = [
          "Select an available Unit conversion for this Item.",
        ];
      }
    }

    if (Object.keys(fields).length) return { kind: "invalid-ingredients" as const, fields };

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
