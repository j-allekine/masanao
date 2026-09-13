import { beforeEach, describe, expect, it } from "vitest";

import {
  canManageItems,
  createItem,
  deleteItem,
  listItems,
  setItemActive,
  updateItem,
} from "@/features/supply-operations/server";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";

const adminActor: CurrentActor = {
  id: "items-admin",
  name: "Municipal administrator",
  username: "items.admin",
};
const staffActor: CurrentActor = {
  id: "items-staff",
  name: "Kitchen staff",
  username: "items.staff",
};

async function createActorUser(actor: CurrentActor, role = "staff") {
  await prisma.user.create({
    data: {
      id: actor.id,
      name: actor.name,
      email: `${actor.username}@internal.masanao`,
      username: actor.username,
      role,
    },
  });
}

async function createLookupRecords() {
  const category = await prisma.category.create({
    data: {
      id: "items-category-dry-goods",
      name: "Dry Goods",
      normalizedName: "dry goods",
    },
  });
  const baseUnit = await prisma.unit.create({
    data: {
      id: "items-unit-kilogram",
      name: "Kilogram",
      abbreviation: "kg",
      normalizedName: "kilogram",
      normalizedAbbreviation: "kg",
    },
  });

  return { category, baseUnit };
}

describe("Master Data Items read path", () => {
  beforeEach(async () => {
    await prisma.item.deleteMany();
    await prisma.category.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("returns an empty catalog", async () => {
    await expect(listItems()).resolves.toEqual([]);
  });

  it("returns safe joined reads sorted by normalized name with lifecycle state", async () => {
    const { category, baseUnit } = await createLookupRecords();

    await prisma.item.createMany({
      data: [
        {
          id: "items-zulu",
          name: "Zulu Rice",
          normalizedName: "zulu rice",
          categoryId: category.id,
          baseUnitId: baseUnit.id,
          note: "Long-grain stock",
        },
        {
          id: "items-alpha",
          name: "alpha beans",
          normalizedName: "alpha beans",
          categoryId: category.id,
          baseUnitId: baseUnit.id,
          isActive: false,
        },
      ],
    });

    const items = await listItems();

    expect(items).toHaveLength(2);
    expect(items).toMatchObject([
      {
        id: "items-alpha",
        name: "alpha beans",
        category: { id: category.id, name: "Dry Goods", isActive: true },
        baseUnit: {
          id: baseUnit.id,
          name: "Kilogram",
          abbreviation: "kg",
          active: true,
        },
        note: null,
        isActive: false,
      },
      {
        id: "items-zulu",
        name: "Zulu Rice",
        category: { id: category.id, name: "Dry Goods", isActive: true },
        baseUnit: {
          id: baseUnit.id,
          name: "Kilogram",
          abbreviation: "kg",
          active: true,
        },
        note: "Long-grain stock",
        isActive: true,
      },
    ]);
    expect(items[0]).not.toHaveProperty("normalizedName");
    expect(items[0]).not.toHaveProperty("categoryId");
    expect(items[0]).not.toHaveProperty("baseUnitId");
    expect(items[0]?.createdAt).toBeTruthy();
    expect(items[0]?.updatedAt).toBeTruthy();
  });

  it("enforces normalized name uniqueness at the database boundary", async () => {
    const { category, baseUnit } = await createLookupRecords();

    await prisma.item.create({
      data: {
        id: "items-unique-first",
        name: "Rice",
        normalizedName: "rice",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });

    await expect(
      prisma.item.create({
        data: {
          id: "items-unique-second",
          name: " rice ",
          normalizedName: "rice",
          categoryId: category.id,
          baseUnitId: baseUnit.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("exposes administrator capability without granting it to staff", async () => {
    await createActorUser(adminActor, "admin");
    await createActorUser(staffActor);

    await expect(canManageItems(adminActor)).resolves.toBe(true);
    await expect(canManageItems(staffActor)).resolves.toBe(false);
  });

  it("creates an active Item with normalized display and lookup values", async () => {
    await createActorUser(adminActor, "admin");
    const { category, baseUnit } = await createLookupRecords();

    const result = await createItem(adminActor, {
      name: "  Rice\n   Flour  ",
      categoryId: category.id,
      baseUnitId: baseUnit.id,
      note: "  Keep dry.\nUse oldest stock first.  ",
    });

    expect(result).toMatchObject({
      ok: true,
      item: {
        name: "Rice Flour",
        category: { id: category.id },
        baseUnit: { id: baseUnit.id },
        note: "Keep dry.\nUse oldest stock first.",
        isActive: true,
      },
    });
    expect(await prisma.item.count()).toBe(1);
  });

  it("rejects duplicate normalized names and inactive lookup records", async () => {
    await createActorUser(adminActor, "admin");
    const { category, baseUnit } = await createLookupRecords();

    await expect(
      createItem(adminActor, {
        name: "Rice Flour",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      }),
    ).resolves.toMatchObject({ ok: true });

    await expect(
      createItem(adminActor, {
        name: " rice   flour ",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: { name: ["An Item with that name already exists."] },
    });

    const inactiveCategory = await prisma.category.create({
      data: {
        id: "items-category-inactive",
        name: "Inactive",
        normalizedName: "inactive",
        isActive: false,
      },
    });
    const invalidLookupResult = await createItem(adminActor, {
      name: "New Item",
      categoryId: inactiveCategory.id,
      baseUnitId: baseUnit.id,
    });

    expect(invalidLookupResult).toMatchObject({
      ok: false,
      kind: "validation",
      fields: { categoryId: ["Select an active Category."] },
    });
  });

  it("rejects Item creation from authenticated staff", async () => {
    await createActorUser(staffActor);
    const { category, baseUnit } = await createLookupRecords();

    await expect(
      createItem(staffActor, {
        name: "Staff Attempt",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
  });

  it("updates an Item while preserving identity and normalized validation", async () => {
    await createActorUser(adminActor, "admin");
    const { category, baseUnit } = await createLookupRecords();
    const replacementCategory = await prisma.category.create({
      data: {
        id: "items-category-canned",
        name: "Canned Goods",
        normalizedName: "canned goods",
      },
    });
    const replacementUnit = await prisma.unit.create({
      data: {
        id: "items-unit-piece",
        name: "Piece",
        abbreviation: "pc",
        normalizedName: "piece",
        normalizedAbbreviation: "pc",
      },
    });
    const item = await prisma.item.create({
      data: {
        id: "items-update-target",
        name: "Brown Rice",
        normalizedName: "brown rice",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });
    await prisma.item.create({
      data: {
        id: "items-update-conflict",
        name: "Canned Beans",
        normalizedName: "canned beans",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });

    const result = await updateItem(adminActor, item.id, {
      name: "  Rice   Flour ",
      categoryId: replacementCategory.id,
      baseUnitId: replacementUnit.id,
      note: "  Revised note  ",
    });

    expect(result).toMatchObject({
      ok: true,
      item: {
        id: item.id,
        name: "Rice Flour",
        category: { id: replacementCategory.id },
        baseUnit: { id: replacementUnit.id },
        note: "Revised note",
      },
    });
    expect(
      await prisma.item.findUnique({ where: { id: item.id } }),
    ).toMatchObject({
      id: item.id,
      normalizedName: "rice flour",
    });

    await expect(
      updateItem(adminActor, item.id, {
        name: " Canned   Beans ",
        categoryId: replacementCategory.id,
        baseUnitId: replacementUnit.id,
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: { name: ["An Item with that name already exists."] },
    });
  });

  it("retains assigned inactive lookups but rejects inactive replacements", async () => {
    await createActorUser(adminActor, "admin");
    const inactiveCategory = await prisma.category.create({
      data: {
        id: "items-update-inactive-category",
        name: "Retired Category",
        normalizedName: "retired category",
        isActive: false,
      },
    });
    const inactiveUnit = await prisma.unit.create({
      data: {
        id: "items-update-inactive-unit",
        name: "Retired Unit",
        abbreviation: "ru",
        normalizedName: "retired unit",
        normalizedAbbreviation: "ru",
        active: false,
      },
    });
    const otherInactiveCategory = await prisma.category.create({
      data: {
        id: "items-update-other-inactive-category",
        name: "Another Retired Category",
        normalizedName: "another retired category",
        isActive: false,
      },
    });
    const otherInactiveUnit = await prisma.unit.create({
      data: {
        id: "items-update-other-inactive-unit",
        name: "Another Retired Unit",
        abbreviation: "au",
        normalizedName: "another retired unit",
        normalizedAbbreviation: "au",
        active: false,
      },
    });
    const item = await prisma.item.create({
      data: {
        id: "items-update-inactive-target",
        name: "Retired Rice",
        normalizedName: "retired rice",
        categoryId: inactiveCategory.id,
        baseUnitId: inactiveUnit.id,
      },
    });

    await expect(
      updateItem(adminActor, item.id, {
        name: "Retired Rice",
        categoryId: inactiveCategory.id,
        baseUnitId: inactiveUnit.id,
        note: "Still assigned",
      }),
    ).resolves.toMatchObject({
      ok: true,
      item: {
        category: { id: inactiveCategory.id, isActive: false },
        baseUnit: { id: inactiveUnit.id, active: false },
      },
    });

    await expect(
      updateItem(adminActor, item.id, {
        name: "Retired Rice",
        categoryId: otherInactiveCategory.id,
        baseUnitId: otherInactiveUnit.id,
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "validation",
      fields: {
        categoryId: ["Select an active Category."],
        baseUnitId: ["Select an active Base Unit."],
      },
    });
  });

  it("rejects Item updates from authenticated staff", async () => {
    await createActorUser(staffActor);
    const { category, baseUnit } = await createLookupRecords();
    const item = await prisma.item.create({
      data: {
        id: "items-staff-update-target",
        name: "Staff Item",
        normalizedName: "staff item",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });

    await expect(
      updateItem(staffActor, item.id, {
        name: "Changed Item",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
  });

  it("deactivates, reactivates, and deletes an unused Item", async () => {
    await createActorUser(adminActor, "admin");
    const { category, baseUnit } = await createLookupRecords();
    await prisma.item.create({
      data: {
        id: "items-lifecycle-target",
        name: "Lifecycle Item",
        normalizedName: "lifecycle item",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });

    await expect(
      setItemActive(adminActor, "items-lifecycle-target", false),
    ).resolves.toMatchObject({
      ok: true,
      item: { id: "items-lifecycle-target", isActive: false },
    });
    await expect(listItems()).resolves.toMatchObject([
      { id: "items-lifecycle-target", isActive: false },
    ]);

    await expect(
      setItemActive(adminActor, "items-lifecycle-target", true),
    ).resolves.toMatchObject({
      ok: true,
      item: { id: "items-lifecycle-target", isActive: true },
    });
    await expect(
      deleteItem(adminActor, "items-lifecycle-target"),
    ).resolves.toEqual({ ok: true });
    await expect(
      prisma.item.findUnique({ where: { id: "items-lifecycle-target" } }),
    ).resolves.toBeNull();
  });

  it("rejects Item lifecycle mutations from authenticated staff", async () => {
    await createActorUser(staffActor);
    const { category, baseUnit } = await createLookupRecords();
    await prisma.item.create({
      data: {
        id: "items-staff-lifecycle-target",
        name: "Staff Lifecycle Item",
        normalizedName: "staff lifecycle item",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });

    await expect(
      setItemActive(staffActor, "items-staff-lifecycle-target", false),
    ).resolves.toMatchObject({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
    await expect(
      deleteItem(staffActor, "items-staff-lifecycle-target"),
    ).resolves.toMatchObject({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
  });
});
