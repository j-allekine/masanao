import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";
import type { IssuanceRecipeSource, IssuanceRecipeOption } from "@/features/issuance/types";
import { isPositiveExactDecimal } from "@/features/supply-operations/domain/delivery-receipt";

export async function listRecipeIssuanceOptionRecords(): Promise<IssuanceRecipeOption[]> {
  const recipes = await prisma.recipe.findMany({
    where: { isActive: true },
    orderBy: { normalizedName: "asc" },
    select: {
      id: true, name: true, baselinePax: true,
      ingredients: { select: {
        itemId: true, enteredQuantity: true,
        item: { select: { isActive: true, baseUnitId: true, baseUnit: { select: { active: true } } } },
        itemUnitConversion: { select: { itemId: true, alternateUnitId: true, baseUnitQuantity: true, alternateUnit: { select: { active: true } } } },
      } },
    },
  });
  return recipes.map((recipe) => {
    const baselineAvailable = recipe.baselinePax !== null && recipe.baselinePax >= 1 && recipe.baselinePax <= 2147483647;
    const available = baselineAvailable && recipe.ingredients.length > 0 && recipe.ingredients.every((ingredient) =>
      ingredient.item.isActive && ingredient.item.baseUnit.active && isPositiveExactDecimal(ingredient.enteredQuantity) &&
      (!ingredient.itemUnitConversion || (ingredient.itemUnitConversion.alternateUnit.active &&
        ingredient.itemUnitConversion.itemId === ingredient.itemId &&
        ingredient.itemUnitConversion.alternateUnitId !== ingredient.item.baseUnitId &&
        isPositiveExactDecimal(ingredient.itemUnitConversion.baseUnitQuantity))),
    );
    return { id: recipe.id, name: recipe.name, baselinePax: recipe.baselinePax, available, reason: available ? null : !baselineAvailable ? "Baseline pax required" : "Ingredients need attention" };
  });
}

// Transaction-owned reads keep the preview revision and first persisted copy consistent.
export async function getRecipeIssuanceSourceRecord(id: string, database: Pick<Prisma.TransactionClient, "recipe"> = prisma): Promise<IssuanceRecipeSource | null> {
  const recipe = await database.recipe.findUnique({ where: { id }, include: { ingredients: {
    include: { item: { include: { baseUnit: true } }, itemUnitConversion: { include: { alternateUnit: true } } },
    orderBy: { id: "asc" },
  } } });
  if (!recipe?.isActive || !recipe.baselinePax || recipe.baselinePax < 1 || recipe.baselinePax > 2147483647 || !recipe.ingredients.length) return null;
  if (recipe.ingredients.some((ingredient) => !isPositiveExactDecimal(ingredient.enteredQuantity) || (ingredient.itemUnitConversion && (!isPositiveExactDecimal(ingredient.itemUnitConversion.baseUnitQuantity) || ingredient.itemUnitConversion.alternateUnitId === ingredient.item.baseUnitId)))) return null;
  if (recipe.ingredients.some((ingredient) => !ingredient.item.isActive || !ingredient.item.baseUnit.active || Boolean(ingredient.itemUnitConversion && (!ingredient.itemUnitConversion.alternateUnit.active || ingredient.itemUnitConversion.itemId !== ingredient.itemId)))) return null;
  return {
    recipeId: recipe.id, recipeName: recipe.name, baselinePax: recipe.baselinePax,
    sourceRevision: createHash("sha256").update(JSON.stringify(recipe)).digest("hex"),
    ingredients: recipe.ingredients.map((ingredient) => {
      const selectedUnit = ingredient.itemUnitConversion?.alternateUnit ?? ingredient.item.baseUnit;
      return { id: ingredient.id, itemId: ingredient.itemId, itemName: ingredient.item.name,
        enteredQuantity: ingredient.enteredQuantity, conversionFactor: ingredient.itemUnitConversion?.baseUnitQuantity ?? "1",
        selectedUnitId: selectedUnit.id, selectedUnitName: selectedUnit.name, selectedUnitAbbreviation: selectedUnit.abbreviation,
        baseUnitId: ingredient.item.baseUnitId, baseUnitName: ingredient.item.baseUnit.name, baseUnitAbbreviation: ingredient.item.baseUnit.abbreviation };
    }),
  };
}
