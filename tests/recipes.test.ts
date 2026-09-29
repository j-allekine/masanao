import { beforeEach, describe, expect, it } from "vitest";

import { createRecipe, listActiveRecipes } from "@/features/recipes/server";
import { deleteItem, updateItem } from "@/features/supply-operations/server";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";

const adminActor: CurrentActor = {
  id: "recipes-admin",
  name: "Municipal administrator",
  username: "recipes.admin",
};

async function createRecipeReferences() {
  const category = await prisma.category.create({
    data: {
      id: "recipes-category",
      name: "Recipe dry goods",
      normalizedName: "recipe dry goods",
    },
  });
  const kilogram = await prisma.unit.create({
    data: {
      id: "recipes-unit-kilogram",
      name: "Kilogram",
      abbreviation: "kg",
      normalizedName: "kilogram",
      normalizedAbbreviation: "kg",
    },
  });
  const gram = await prisma.unit.create({
    data: {
      id: "recipes-unit-gram",
      name: "Gram",
      abbreviation: "g",
      normalizedName: "gram",
      normalizedAbbreviation: "g",
    },
  });
  const item = await prisma.item.create({
    data: {
      id: "recipes-item-rice",
      name: "Rice",
      normalizedName: "rice",
      categoryId: category.id,
      baseUnitId: kilogram.id,
    },
  });
  const conversion = await prisma.itemUnitConversion.create({
    data: {
      id: "recipes-conversion-gram",
      itemId: item.id,
      alternateUnitId: gram.id,
      baseUnitQuantity: "0.001",
    },
  });

  return { category, kilogram, gram, item, conversion };
}

describe("Recipes catalog and persistence foundation", () => {
  beforeEach(async () => {
    await prisma.recipeIngredient.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.itemUnitConversion.deleteMany();
    await prisma.item.deleteMany();
    await prisma.category.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("returns an empty active catalog", async () => {
    await expect(listActiveRecipes()).resolves.toEqual([]);
  });

  it("returns active Recipes sorted by normalized name with an Ingredient count", async () => {
    const { item } = await createRecipeReferences();
    await prisma.recipe.create({
      data: {
        id: "recipes-zulu",
        name: "Zulu Soup",
        normalizedName: "zulu soup",
        ingredients: {
          create: {
            id: "recipes-zulu-rice",
            itemId: item.id,
            enteredQuantity: "2.5",
          },
        },
      },
    });
    await prisma.recipe.create({
      data: {
        id: "recipes-alpha",
        name: "Alpha Soup",
        normalizedName: "alpha soup",
      },
    });
    await prisma.recipe.create({
      data: {
        id: "recipes-inactive",
        name: "Inactive Soup",
        normalizedName: "inactive soup",
        isActive: false,
      },
    });

    await expect(listActiveRecipes()).resolves.toEqual([
      {
        id: "recipes-alpha",
        name: "Alpha Soup",
        ingredientCount: 0,
        isActive: true,
      },
      {
        id: "recipes-zulu",
        name: "Zulu Soup",
        ingredientCount: 1,
        isActive: true,
      },
    ]);
  });

  it("stores either an Item Base Unit selection or its exact Item Unit Conversion", async () => {
    const { category, kilogram, item, conversion } = await createRecipeReferences();
    const secondItem = await prisma.item.create({
      data: {
        id: "recipes-item-onion",
        name: "Onion",
        normalizedName: "onion",
        categoryId: category.id,
        baseUnitId: kilogram.id,
      },
    });
    const secondConversion = await prisma.itemUnitConversion.create({
      data: {
        id: "recipes-conversion-onion-gram",
        itemId: secondItem.id,
        alternateUnitId: conversion.alternateUnitId,
        baseUnitQuantity: "0.001",
      },
    });
    const recipe = await prisma.recipe.create({
      data: {
        id: "recipes-conversion-target",
        name: "Rice Porridge",
        normalizedName: "rice porridge",
        preparationNote: "Cook until soft.",
      },
    });

    await prisma.recipeIngredient.createMany({
      data: [
        {
          id: "recipes-base-unit-ingredient",
          recipeId: recipe.id,
          itemId: item.id,
          enteredQuantity: "2",
        },
      ],
    });

    expect(
      await prisma.recipeIngredient.findUnique({
        where: {
          recipeId_itemId: { recipeId: recipe.id, itemId: item.id },
        },
      }),
    ).toMatchObject({ itemUnitConversionId: null, enteredQuantity: "2" });

    await expect(
      prisma.recipeIngredient.create({
        data: {
          id: "recipes-alternate-unit-ingredient",
          recipeId: recipe.id,
          itemId: secondItem.id,
          enteredQuantity: "500",
          itemUnitConversionId: secondConversion.id,
        },
      }),
    ).resolves.toMatchObject({ itemUnitConversionId: secondConversion.id });

    await expect(
      prisma.recipeIngredient.create({
        data: {
          id: "recipes-duplicate-item",
          recipeId: recipe.id,
          itemId: item.id,
          enteredQuantity: "500",
          itemUnitConversionId: conversion.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("restricts Item deletion and Base Unit changes after a Recipe Ingredient references it", async () => {
    await prisma.user.create({
      data: {
        id: adminActor.id,
        name: adminActor.name,
        email: "recipes.admin@internal.masanao",
        username: adminActor.username,
        role: "admin",
      },
    });
    const { category, gram, item } = await createRecipeReferences();
    await prisma.itemUnitConversion.deleteMany({ where: { itemId: item.id } });
    const recipe = await prisma.recipe.create({
      data: {
        id: "recipes-reference-target",
        name: "Reference Soup",
        normalizedName: "reference soup",
      },
    });
    await prisma.recipeIngredient.create({
      data: {
        id: "recipes-reference-ingredient",
        recipeId: recipe.id,
        itemId: item.id,
        enteredQuantity: "1",
      },
    });

    await expect(deleteItem(adminActor, item.id)).resolves.toMatchObject({
      ok: false,
      kind: "referenced",
    });
    await expect(
      updateItem(adminActor, item.id, {
        name: item.name,
        categoryId: category.id,
        baseUnitId: gram.id,
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "validation",
      fields: {
        baseUnitId: [
          "Base Unit cannot change while a Recipe Ingredient references this Item.",
        ],
      },
    });
  });

  it("creates a Base Unit Recipe with active Items and no Inventory Ledger movement", async () => {
    await prisma.user.create({
      data: {
        id: adminActor.id,
        name: adminActor.name,
        email: "recipes.admin@internal.masanao",
        username: adminActor.username,
        role: "admin",
      },
    });
    const { item } = await createRecipeReferences();

    await expect(
      createRecipe(adminActor, {
        name: "  Chicken arroz caldo  ",
        preparationNote: " Simmer until tender. ",
        ingredients: [{ itemId: item.id, quantity: "2.5" }],
      }),
    ).resolves.toMatchObject({
      ok: true,
      recipe: { name: "Chicken arroz caldo", ingredientCount: 1, isActive: true },
    });

    await expect(prisma.recipe.findFirstOrThrow({
      where: { normalizedName: "chicken arroz caldo" },
      include: { ingredients: true },
    })).resolves.toMatchObject({
      preparationNote: "Simmer until tender.",
      ingredients: [{ itemId: item.id, enteredQuantity: "2.5", itemUnitConversionId: null }],
    });
    await expect(prisma.inventoryLedgerMovement.count()).resolves.toBe(0);
  });

  it("rejects a Recipe Ingredient that no longer references an active Item", async () => {
    await prisma.user.create({
      data: {
        id: adminActor.id,
        name: adminActor.name,
        email: "recipes.admin@internal.masanao",
        username: adminActor.username,
        role: "admin",
      },
    });
    const { item } = await createRecipeReferences();
    await prisma.item.update({ where: { id: item.id }, data: { isActive: false } });

    await expect(
      createRecipe(adminActor, {
        name: "Inactive Item Soup",
        ingredients: [{ itemId: item.id, quantity: "1" }],
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "inactive",
      fields: { ingredients: ["Select active Items for every Ingredient."] },
    });
  });
});
