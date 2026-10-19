import { beforeEach, describe, expect, it } from "vitest";

import {
  canManageItems,
  createItem,
  createItemUnitConversion,
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
    await prisma.itemUnitConversion.deleteMany();
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
        { reorderLevel: "10",
          id: "items-zulu",
          name: "Zulu Rice",
          normalizedName: "zulu rice",
          categoryId: category.id,
          baseUnitId: baseUnit.id,
          note: "Long-grain stock",
        },
        { reorderLevel: "10",
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
      data: { reorderLevel: "10",
        id: "items-unique-first",
        name: "Rice",
        normalizedName: "rice",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });

    await expect(
      prisma.item.create({
        data: { reorderLevel: "10",
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

    const result = await createItem(adminActor, { reorderLevel: "10",
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
        issuanceQuantityPolicy: "allow-decimals",
        isActive: true,
      },
    });
    expect(await prisma.item.count()).toBe(1);
  });

  it("rejects duplicate normalized names and inactive lookup records", async () => {
    await createActorUser(adminActor, "admin");
    const { category, baseUnit } = await createLookupRecords();

    await expect(
      createItem(adminActor, { reorderLevel: "10",
        name: "Rice Flour",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      }),
    ).resolves.toMatchObject({ ok: true });

    await expect(
      createItem(adminActor, { reorderLevel: "10",
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
    const invalidLookupResult = await createItem(adminActor, { reorderLevel: "10",
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
      createItem(staffActor, { reorderLevel: "10",
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
      data: { reorderLevel: "10",
        id: "items-update-target",
        name: "Brown Rice",
        normalizedName: "brown rice",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });
    await prisma.item.create({
      data: { reorderLevel: "10",
        id: "items-update-conflict",
        name: "Canned Beans",
        normalizedName: "canned beans",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });

    const result = await updateItem(adminActor, item.id, { reorderLevel: "10",
      name: "  Rice   Flour ",
      categoryId: replacementCategory.id,
      baseUnitId: replacementUnit.id, reorderLevelBaseUnitId: replacementUnit.id,
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
      updateItem(adminActor, item.id, { reorderLevel: "10",
        name: " Canned   Beans ",
        categoryId: replacementCategory.id,
        baseUnitId: replacementUnit.id, reorderLevelBaseUnitId: replacementUnit.id,
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: { name: ["An Item with that name already exists."] },
    });
  });

  it("persists issuance policy in public reads and preserves it for older update callers", async () => {
    await createActorUser(adminActor, "admin");
    const { category, baseUnit } = await createLookupRecords();
    const item = await prisma.item.create({
      data: { reorderLevel: "10",
        id: "items-policy-target",
        name: "Individually tracked eggs",
        normalizedName: "individually tracked eggs",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });
    const alternateUnit = await prisma.unit.create({
      data: {
        id: "items-policy-sack",
        name: "Sack",
        abbreviation: "sack",
        normalizedName: "sack",
        normalizedAbbreviation: "sack",
      },
    });
    await prisma.itemUnitConversion.create({
      data: {
        id: "items-policy-sack-conversion",
        itemId: item.id,
        alternateUnitId: alternateUnit.id,
        baseUnitQuantity: "25.00",
      },
    });

    await expect(
      listItems(),
    ).resolves.toMatchObject([
      {
        id: item.id,
        issuanceQuantityPolicy: "allow-decimals",
        unitConversions: [
          { baseUnitQuantity: "25.00", label: "Sack (25.00 kg)" },
        ],
      },
    ]);

    await expect(
      updateItem(adminActor, item.id, { reorderLevel: "10",
        name: item.name,
        categoryId: category.id,
        baseUnitId: baseUnit.id,
        issuanceQuantityPolicy: "whole-numbers-only",
      }),
    ).resolves.toMatchObject({
      ok: true,
      item: { issuanceQuantityPolicy: "whole-numbers-only" },
    });

    await expect(
      updateItem(adminActor, item.id, { reorderLevel: "10",
        name: item.name,
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      }),
    ).resolves.toMatchObject({
      ok: true,
      item: { issuanceQuantityPolicy: "whole-numbers-only" },
    });

    await expect(listItems()).resolves.toMatchObject([
      {
        id: item.id,
        issuanceQuantityPolicy: "whole-numbers-only",
        unitConversions: [
          { baseUnitQuantity: "25.00", label: "Sack (25.00 kg)" },
        ],
      },
    ]);
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
    await expect(
      prisma.itemUnitConversion.findUnique({
        where: { id: "items-policy-sack-conversion" },
      }),
    ).resolves.toMatchObject({ baseUnitQuantity: "25.00" });
  });

  it("rejects unknown issuance policy values through the public interface", async () => {
    await createActorUser(adminActor, "admin");
    const { category, baseUnit } = await createLookupRecords();

    await expect(
      createItem(adminActor, { reorderLevel: "10",
        name: "Tampered Item",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
        issuanceQuantityPolicy: "infer-from-unit",
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "validation",
      fields: { issuanceQuantityPolicy: expect.any(Array) },
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
      data: { reorderLevel: "10",
        id: "items-update-inactive-target",
        name: "Retired Rice",
        normalizedName: "retired rice",
        categoryId: inactiveCategory.id,
        baseUnitId: inactiveUnit.id,
      },
    });

    await expect(
      updateItem(adminActor, item.id, { reorderLevel: "10",
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
      updateItem(adminActor, item.id, { reorderLevel: "10",
        name: "Retired Rice",
        categoryId: otherInactiveCategory.id,
        baseUnitId: otherInactiveUnit.id, reorderLevelBaseUnitId: otherInactiveUnit.id,
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
      data: { reorderLevel: "10",
        id: "items-staff-update-target",
        name: "Staff Item",
        normalizedName: "staff item",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });

    await expect(
      updateItem(staffActor, item.id, { reorderLevel: "10",
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
      data: { reorderLevel: "10",
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
      data: { reorderLevel: "10",
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

  it("stores exact Item-specific alternate Units and protects their Base Unit", async () => {
    await createActorUser(adminActor, "admin");
    const { category, baseUnit } = await createLookupRecords();
    const sack = await prisma.unit.create({ data: { id: "items-unit-sack", name: "Sack", abbreviation: "sack", normalizedName: "sack", normalizedAbbreviation: "sack" } });
    const item = await prisma.item.create({ data: { reorderLevel: "10", id: "items-conversion-rice", name: "Rice", normalizedName: "rice", categoryId: category.id, baseUnitId: baseUnit.id } });

    await expect(createItemUnitConversion(staffActor, item.id, { alternateUnitId: sack.id, baseUnitQuantity: "25" })).resolves.toMatchObject({ ok: false, kind: "forbidden" });
    await expect(createItemUnitConversion(adminActor, item.id, { alternateUnitId: sack.id, baseUnitQuantity: "25.00" })).resolves.toMatchObject({ ok: true, conversion: { baseUnitQuantity: "25", label: "Sack (25 kg)" } });
    await expect(createItemUnitConversion(adminActor, item.id, { alternateUnitId: sack.id, baseUnitQuantity: "25" })).resolves.toMatchObject({ ok: false, kind: "duplicate" });
    await expect(createItemUnitConversion(adminActor, item.id, { alternateUnitId: sack.id, baseUnitQuantity: "2" })).resolves.toMatchObject({ ok: true });
    await expect(createItemUnitConversion(adminActor, item.id, { alternateUnitId: sack.id, baseUnitQuantity: "10" })).resolves.toMatchObject({ ok: true });
    await expect(createItemUnitConversion(adminActor, item.id, { alternateUnitId: sack.id, baseUnitQuantity: "50" })).resolves.toMatchObject({ ok: true, conversion: { label: "Sack (50 kg)" } });
    await expect(createItemUnitConversion(adminActor, item.id, { alternateUnitId: baseUnit.id, baseUnitQuantity: "1" })).resolves.toMatchObject({ ok: false, kind: "validation", fields: { alternateUnitId: ["The Base Unit cannot be an alternate Unit."] } });
    await expect(updateItem(adminActor, item.id, { reorderLevel: "10", name: item.name, categoryId: category.id, baseUnitId: sack.id })).resolves.toMatchObject({ ok: false, kind: "validation", fields: { baseUnitId: ["Base Unit cannot change after alternate Units are configured."] } });
    await expect(deleteItem(adminActor, item.id)).resolves.toMatchObject({
      ok: false,
      kind: "referenced",
      error: "This Item cannot be deleted because operational records or configured alternate Units reference it.",
    });
    await expect(listItems()).resolves.toMatchObject([{
      id: item.id,
      unitConversions: [
        { label: "Sack (2 kg)" },
        { label: "Sack (10 kg)" },
        { label: "Sack (25 kg)" },
        { label: "Sack (50 kg)" },
      ],
    }]);
  });

  it("rejects invalid quantities and inactive Item or alternate Unit references", async () => {
    await createActorUser(adminActor, "admin");
    const { category, baseUnit } = await createLookupRecords();
    const sack = await prisma.unit.create({
      data: {
        id: "items-unit-inactive-sack",
        name: "Sack",
        abbreviation: "sack",
        normalizedName: "sack",
        normalizedAbbreviation: "sack",
        active: false,
      },
    });
    const item = await prisma.item.create({
      data: { reorderLevel: "10",
        id: "items-conversion-validation",
        name: "Validation Rice",
        normalizedName: "validation rice",
        categoryId: category.id,
        baseUnitId: baseUnit.id,
      },
    });

    for (const baseUnitQuantity of ["", "0", "0.00", "-1", ".5", "1.", "1e3"]) {
      await expect(
        createItemUnitConversion(adminActor, item.id, {
          alternateUnitId: sack.id,
          baseUnitQuantity,
        }),
      ).resolves.toMatchObject({
        ok: false,
        kind: "validation",
        fields: { baseUnitQuantity: expect.any(Array) },
      });
    }

    await expect(
      createItemUnitConversion(adminActor, item.id, {
        alternateUnitId: sack.id,
        baseUnitQuantity: "25",
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "validation",
      fields: { alternateUnitId: ["Select an active alternate Unit."] },
    });

    await prisma.item.update({ where: { id: item.id }, data: { isActive: false } });
    await expect(
      createItemUnitConversion(adminActor, item.id, {
        alternateUnitId: baseUnit.id,
        baseUnitQuantity: "25",
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "inactive",
      error: "Alternate Units cannot be added to an Inactive Item.",
    });
  });
  it("validates exact Reorder levels and enforces administrator writes without moving stock", async () => {
    const { category, baseUnit } = await createLookupRecords();
    await createActorUser(adminActor, "admin");
    await createActorUser(staffActor);
    const input = { name: "Reorder test", categoryId: category.id, baseUnitId: baseUnit.id, reorderLevel: "0.000000000000000001", issuanceQuantityPolicy: "whole-numbers-only" };
    for (const reorderLevel of [undefined, "", "0", "0.000", "-1", "1e3", "NaN", "1.2.3"]) {
      const result = await createItem(adminActor, { ...input, reorderLevel });
      expect(result).toMatchObject({ ok: false, kind: "validation", fields: { reorderLevel: expect.any(Array) } });
    }
    await expect(createItem(staffActor, input)).resolves.toMatchObject({ ok: false, kind: "forbidden" });
    const result = await createItem(adminActor, input);
    expect(result).toMatchObject({ ok: true, item: { reorderLevel: input.reorderLevel } });
    if (!result.ok) return;
    const before = await prisma.inventoryLedgerMovement.count();
    await expect(updateItem(staffActor, result.item.id, { ...input, reorderLevel: "3" })).resolves.toMatchObject({ ok: false, kind: "forbidden" });
    await expect(updateItem(adminActor, result.item.id, { ...input, reorderLevel: "12.500" })).resolves.toMatchObject({ ok: true, item: { reorderLevel: "12.5" } });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(before);
    expect((await listItems()).find((item) => item.id === result.item.id)?.reorderLevel).toBe("12.5");
    await prisma.user.update({ where: { id: adminActor.id }, data: { disabled: true } });
    await expect(updateItem(adminActor, result.item.id, { ...input, reorderLevel: "4" })).resolves.toMatchObject({ ok: false, kind: "forbidden" });
  });

  it("requires deliberate level entry when changing an otherwise unlocked Base Unit", async () => {
    const { category, baseUnit } = await createLookupRecords();
    await createActorUser(adminActor, "admin");
    const otherUnit = await prisma.unit.create({ data: { id: "reorder-other-unit", name: "Piece", abbreviation: "pc", normalizedName: "piece", normalizedAbbreviation: "pc" } });
    const input = { name: "Unlocked", categoryId: category.id, baseUnitId: baseUnit.id, reorderLevel: "2" };
    const created = await createItem(adminActor, input);
    if (!created.ok) throw new Error("Fixture failed");
    await expect(updateItem(adminActor, created.item.id, { ...input, baseUnitId: otherUnit.id })).resolves.toMatchObject({ ok: false, fields: { reorderLevel: expect.any(Array) } });
    await expect(updateItem(adminActor, created.item.id, { ...input, baseUnitId: otherUnit.id, reorderLevelBaseUnitId: otherUnit.id, reorderLevel: "0.5" })).resolves.toMatchObject({ ok: true, item: { baseUnit: { id: otherUnit.id }, reorderLevel: "0.5" } });
  });

});
