import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { RecipeInput } from "../../schemas/recipe";
import type {
  RecipeCatalogItem,
  RecipeDetailItem,
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
    },
    orderBy: [{ normalizedName: "asc" }, { id: "asc" }],
  });

  return items;
}

export type RecipeCreateWriteResult =
  | { kind: "created"; recipe: RecipeCatalogItem }
  | { kind: "duplicate" }
  | { kind: "inactive-item" };

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

    if (activeItems.length !== input.ingredients.length) {
      return { kind: "inactive-item" as const };
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
