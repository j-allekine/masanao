import { beforeEach, describe, expect, it } from "vitest";

import {
  canManageRecipes,
  createRecipe,
  getActiveRecipe,
  listActiveRecipes,
  updateRecipe,
} from "@/features/recipes/server";
import { deleteItem, updateItem } from "@/features/supply-operations/server";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";

const adminActor: CurrentActor = {
  id: "recipes-admin",
  name: "Municipal administrator",
  username: "recipes.admin",
};

const staffActor: CurrentActor = {
  id: "recipes-staff",
  name: "Kitchen staff",
  username: "recipes.staff",
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
        needsAttention: false,
      },
      {
        id: "recipes-zulu",
        name: "Zulu Soup",
        ingredientCount: 1,
        isActive: true,
        needsAttention: false,
      },
    ]);
  });

  it("lets staff read an active Recipe and its Ingredient details, but not inactive Recipes", async () => {
    const { item, conversion } = await createRecipeReferences();
    await prisma.recipe.create({
      data: {
        id: "recipes-staff-visible",
        name: "Staff Visible Soup",
        normalizedName: "staff visible soup",
        preparationNote: "Use the usual kitchen pot.",
        ingredients: {
          create: {
            id: "recipes-staff-visible-ingredient",
            itemId: item.id,
            enteredQuantity: "500",
            itemUnitConversionId: conversion.id,
          },
        },
      },
    });
    await prisma.recipe.create({
      data: {
        id: "recipes-staff-hidden",
        name: "Staff Hidden Soup",
        normalizedName: "staff hidden soup",
        isActive: false,
      },
    });

    await expect(getActiveRecipe("recipes-staff-visible")).resolves.toEqual({
      id: "recipes-staff-visible",
      name: "Staff Visible Soup",
      preparationNote: "Use the usual kitchen pot.",
      isActive: true,
      ingredients: [
        {
          id: "recipes-staff-visible-ingredient",
          itemId: "recipes-item-rice",
          enteredQuantity: "500",
          itemUnitConversionId: "recipes-conversion-gram",
          item: {
            name: "Rice",
            baseUnit: { name: "Kilogram", abbreviation: "kg" },
          },
          itemUnitConversion: {
            alternateUnit: { name: "Gram", abbreviation: "g" },
          },
        },
      ],
    });
    await expect(getActiveRecipe("recipes-staff-hidden")).resolves.toBeNull();
  });

  it("rejects a staff member's direct Recipe create request without changing persistence", async () => {
    await prisma.user.create({
      data: {
        id: staffActor.id,
        name: staffActor.name,
        email: "recipes.staff@internal.masanao",
        username: staffActor.username,
        role: "staff",
      },
    });
    const { item } = await createRecipeReferences();

    await expect(canManageRecipes(staffActor)).resolves.toBe(false);
    await expect(
      createRecipe(staffActor, {
        name: "Unauthorized Soup",
        ingredients: [{ itemId: item.id, quantity: "1" }],
      }),
    ).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
      fields: {},
    });
    await expect(prisma.recipe.count()).resolves.toBe(0);
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
        ingredients: [{ itemId: item.id, itemUnitConversionId: null, quantity: "2.5" }],
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

  it("stores an Item's exact active Unit Conversion and rejects unrelated or Base Unit conversions", async () => {
    await prisma.user.create({
      data: {
        id: adminActor.id,
        name: adminActor.name,
        email: "recipes.admin@internal.masanao",
        username: adminActor.username,
        role: "admin",
      },
    });
    const { category, kilogram, item, conversion } = await createRecipeReferences();
    const onion = await prisma.item.create({
      data: {
        id: "recipes-conversion-onion-item",
        name: "Onion",
        normalizedName: "onion",
        categoryId: category.id,
        baseUnitId: kilogram.id,
      },
    });
    const invalidBaseUnitConversion = await prisma.itemUnitConversion.create({
      data: {
        id: "recipes-invalid-base-unit-conversion",
        itemId: item.id,
        alternateUnitId: kilogram.id,
        baseUnitQuantity: "1",
      },
    });

    await expect(
      createRecipe(adminActor, {
        name: "Converted Rice Porridge",
        ingredients: [
          {
            itemId: item.id,
            itemUnitConversionId: conversion.id,
            quantity: "500",
          },
        ],
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      prisma.recipeIngredient.findFirstOrThrow({
        where: { recipe: { normalizedName: "converted rice porridge" } },
      }),
    ).resolves.toMatchObject({
      itemId: item.id,
      itemUnitConversionId: conversion.id,
      enteredQuantity: "500",
    });

    await expect(
      createRecipe(adminActor, {
        name: "Invalid Onion Soup",
        ingredients: [
          {
            itemId: onion.id,
            itemUnitConversionId: conversion.id,
            quantity: "1",
          },
        ],
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "validation",
      fields: { "ingredients.0.itemUnitConversionId": [expect.any(String)] },
    });
    await expect(
      createRecipe(adminActor, {
        name: "Invalid Base Unit Soup",
        ingredients: [
          {
            itemId: item.id,
            itemUnitConversionId: invalidBaseUnitConversion.id,
            quantity: "1",
          },
        ],
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "validation",
      fields: { "ingredients.0.itemUnitConversionId": [expect.any(String)] },
    });
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
      kind: "validation",
      fields: { "ingredients.0.itemId": ["Select an active Item."] },
    });
  });

  it("flags a Recipe when its Base Unit becomes inactive", async () => {
    const { item, kilogram } = await createRecipeReferences();
    await prisma.recipe.create({
      data: {
        id: "base-unit-needs-attention",
        name: "Base Unit Recipe",
        normalizedName: "base unit recipe",
        ingredients: {
          create: {
            id: "base-unit-needs-attention-ingredient",
            itemId: item.id,
            enteredQuantity: "1",
          },
        },
      },
    });
    await prisma.unit.update({ where: { id: kilogram.id }, data: { active: false } });

    await expect(listActiveRecipes()).resolves.toContainEqual({
      id: "base-unit-needs-attention",
      name: "Base Unit Recipe",
      ingredientCount: 1,
      isActive: true,
      needsAttention: true,
    });
  });

  it("rejects a Recipe with no Ingredients", async () => {
    await prisma.user.create({
      data: {
        id: adminActor.id,
        name: adminActor.name,
        email: "recipes.admin@internal.masanao",
        username: adminActor.username,
        role: "admin",
      },
    });

    await expect(
      createRecipe(adminActor, {
        name: "Ingredient-free Recipe",
        ingredients: [],
      }),
    ).resolves.toEqual({
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Recipe fields.",
      fields: { ingredients: ["Add at least one Ingredient."] },
    });
    await expect(prisma.recipe.count()).resolves.toBe(0);
  });

  it("returns row-level validation without creating a partial Recipe", async () => {
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
        name: "Complete Template Check",
        ingredients: [
          { itemId: item.id, quantity: "0" },
          { itemId: item.id, quantity: "2" },
        ],
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "validation",
      fields: {
        "ingredients.0.quantity": ["Enter a positive exact-decimal quantity."],
        "ingredients.0.itemId": ["An Item can appear only once in a Recipe."],
        "ingredients.1.itemId": ["An Item can appear only once in a Recipe."],
      },
    });
    await expect(prisma.recipe.count()).resolves.toBe(0);
  });

  it("rejects unavailable Item Unit Conversions without creating a partial Recipe", async () => {
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
        name: "Unavailable Unit Soup",
        ingredients: [
          {
            itemId: item.id,
            quantity: "1",
            itemUnitConversionId: "missing-conversion",
          },
        ],
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "validation",
      fields: {
        "ingredients.0.itemUnitConversionId": [
          "Select an available Unit conversion for this Item.",
        ],
      },
    });
    await expect(prisma.recipe.count()).resolves.toBe(0);
  });

  it("rejects duplicate normalized names across inactive Recipes", async () => {
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
    await prisma.recipe.create({
      data: {
        id: "inactive-name-target",
        name: "Rice Soup",
        normalizedName: "rice soup",
        isActive: false,
      },
    });

    await expect(
      createRecipe(adminActor, {
        name: "  RICE SOUP  ",
        ingredients: [{ itemId: item.id, quantity: "1" }],
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: { name: ["A Recipe with that name already exists."] },
    });
    await expect(prisma.recipe.count()).resolves.toBe(1);
  });

  it("rejects an update submitted after the Recipe was deactivated", async () => {
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
    const created = await createRecipe(adminActor, {
      name: "Deactivation Guard Soup",
      ingredients: [{ itemId: item.id, quantity: "1" }],
    });
    if (!created.ok) throw new Error("Recipe fixture did not create.");

    await prisma.recipe.update({
      where: { id: created.recipe.id },
      data: { isActive: false },
    });

    await expect(
      updateRecipe(adminActor, created.recipe.id, {
        name: "Changed after deactivation",
        ingredients: [{ itemId: item.id, quantity: "2" }],
      }),
    ).resolves.toEqual({
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Ingredient rows.",
      fields: { form: ["Inactive Recipes cannot be edited. Reactivate this Recipe first."] },
    });
    await expect(prisma.recipe.findUniqueOrThrow({ where: { id: created.recipe.id } })).resolves.toMatchObject({
      name: "Deactivation Guard Soup",
      isActive: false,
    });
  });
});
