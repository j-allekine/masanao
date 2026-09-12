import { beforeEach, describe, expect, it } from "vitest";

import {
  canManageItems,
  createItem,
  listItems,
} from "@/features/master-data/server";
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
});
