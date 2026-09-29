import "server-only";

import { prisma } from "@/prisma/client";

import type { RecipeCatalogItem } from "../../types";

export async function listActiveRecipeRecords(): Promise<RecipeCatalogItem[]> {
  const recipes = await prisma.recipe.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      isActive: true,
      _count: { select: { ingredients: true } },
    },
    orderBy: [{ normalizedName: "asc" }, { id: "asc" }],
  });

  return recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    ingredientCount: recipe._count.ingredients,
    isActive: recipe.isActive,
  }));
}
