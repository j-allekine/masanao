import "server-only";

import { formatDisplayNumber } from "@/lib/format-display-number";
import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { ItemInput } from "../../schemas/item";
import type { ItemListItem, ItemUnitConversionListItem } from "../../types";
import { sortItemUnitConversions } from "../../domain/item-unit-conversion";
import type { CurrentActor } from "@/server/auth";
import type { ItemWithConversionsInput } from "../../schemas/item-with-conversions";
import type { ItemWithConversionsResult } from "../../item-with-conversions-types";

const itemListSelect = {
  id: true,
  name: true,
  category: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },
  baseUnit: {
    select: {
      id: true,
      name: true,
      abbreviation: true,
      active: true,
    },
  },
  reorderLevel: true,
  issuanceQuantityPolicy: true,
  note: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  unitConversions: {
    select: {
      id: true,
      baseUnitQuantity: true,
      alternateUnit: { select: { id: true, name: true, abbreviation: true, active: true } },
    },
    orderBy: [{ alternateUnit: { normalizedName: "asc" } }, { id: "asc" }] satisfies Prisma.ItemUnitConversionOrderByWithRelationInput[],
  },
  _count: {
    select: { deliveryReceiptLines: true },
  },
} as const;

type ItemListRecord = Prisma.ItemGetPayload<{
  select: typeof itemListSelect;
}>;

type ItemDatabase = Pick<
  Prisma.TransactionClient,
  "category" | "item" | "unit"
>;

export type ItemCreateWriteResult =
  | { kind: "created"; item: ItemListItem }
  | { kind: "duplicate" }
  | { kind: "invalid-lookups"; category: boolean; baseUnit: boolean };

export type ItemUpdateWriteResult =
  | { kind: "updated"; item: ItemListItem }
  | { kind: "duplicate" }
  | { kind: "not-found" }
  | { kind: "reorder-level-unit-required" }
  | {
      kind: "base-unit-locked";
      reason: "alternate-units" | "stock-activity" | "recipe-ingredients" | "issuance";
    }
  | { kind: "invalid-lookups"; category: boolean; baseUnit: boolean };

function toItemListItem(item: ItemListRecord): ItemListItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    baseUnit: item.baseUnit,
    reorderLevel: item.reorderLevel,
    issuanceQuantityPolicy: item.issuanceQuantityPolicy as ItemListItem["issuanceQuantityPolicy"],
    note: item.note,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    unitConversions: sortItemUnitConversions(item.unitConversions.map((conversion) => ({
      id: conversion.id,
      alternateUnit: conversion.alternateUnit,
      baseUnitQuantity: conversion.baseUnitQuantity,
      label: `${conversion.alternateUnit.name} (${formatDisplayNumber(conversion.baseUnitQuantity)} ${item.baseUnit.abbreviation})`,
    }))),
    hasPostedDeliveryReceiptLines: item._count.deliveryReceiptLines > 0,
  };
}

const conversionSelect = {
  id: true,
  baseUnitQuantity: true,
  alternateUnit: { select: { id: true, name: true, abbreviation: true, active: true } },
  item: { select: { baseUnit: { select: { abbreviation: true } } } },
} as const;

function toConversionListItem(conversion: Prisma.ItemUnitConversionGetPayload<{ select: typeof conversionSelect }>): ItemUnitConversionListItem {
  return {
    id: conversion.id,
    alternateUnit: conversion.alternateUnit,
    baseUnitQuantity: conversion.baseUnitQuantity,
    label: `${conversion.alternateUnit.name} (${formatDisplayNumber(conversion.baseUnitQuantity)} ${conversion.item.baseUnit.abbreviation})`,
  };
}

export async function createItemUnitConversionRecord(input: {
  itemId: string;
  alternateUnitId: string;
  baseUnitQuantity: string;
}, actor: CurrentActor) {
  return prisma.$transaction(async (transaction) => {
    const administrator = await transaction.user.findFirst({ where: { id: actor.id, role: "admin", disabled: false }, select: { id: true } });
    if (!administrator) return { kind: "forbidden" as const };
    const item = await transaction.item.findUnique({
      where: { id: input.itemId },
      select: { id: true, baseUnitId: true, isActive: true },
    });
    if (!item) return { kind: "not-found" as const };
    if (!item.isActive) return { kind: "inactive-item" as const };
    if (item.baseUnitId === input.alternateUnitId) return { kind: "base-unit" as const };

    const alternateUnit = await transaction.unit.findFirst({
      where: { id: input.alternateUnitId, active: true }, select: { id: true },
    });
    if (!alternateUnit) return { kind: "invalid-unit" as const };

    try {
      const conversion = await transaction.itemUnitConversion.create({
        data: { id: crypto.randomUUID(), ...input }, select: conversionSelect,
      });
      return { kind: "created" as const, conversion: toConversionListItem(conversion) };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) return { kind: "duplicate" as const };
      throw error;
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function isUniqueConstraintViolation(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function isRecordNotFound(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

export function isRestrictiveRelationViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2003" || error.code === "P2014")
  );
}

async function findItemRecord(database: ItemDatabase, id: string) {
  return database.item.findUnique({
    where: { id },
    select: {
      id: true,
      categoryId: true,
      baseUnitId: true,
      _count: {
        select: {
          unitConversions: true,
          deliveryReceiptLines: true,
          recipeIngredients: true,
          issuanceIngredients: true,
          issuanceStockItems: true,
        },
      },
    },
  });
}

async function findItemConflictRecord(
  database: ItemDatabase,
  input: ItemInput,
  excludeId?: string,
) {
  return database.item.findFirst({
    where: {
      normalizedName: input.normalizedName,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
}

async function findActiveItemLookups(
  database: ItemDatabase,
  input: ItemInput,
  existing?: { categoryId: string; baseUnitId: string },
) {
  const [category, baseUnit] = await Promise.all([
    database.category.findFirst({
      where: {
        id: input.categoryId,
        OR: [
          { isActive: true },
          ...(existing?.categoryId === input.categoryId
            ? [{ id: existing.categoryId }]
            : []),
        ],
      },
      select: { id: true },
    }),
    database.unit.findFirst({
      where: {
        id: input.baseUnitId,
        OR: [
          { active: true },
          ...(existing?.baseUnitId === input.baseUnitId
            ? [{ id: existing.baseUnitId }]
            : []),
        ],
      },
      select: { id: true },
    }),
  ]);

  return { category, baseUnit };
}

async function createItemRecord(database: ItemDatabase, input: ItemInput) {
  const item = await database.item.create({
    data: {
      id: crypto.randomUUID(),
      name: input.name,
      normalizedName: input.normalizedName,
      categoryId: input.categoryId,
      baseUnitId: input.baseUnitId,
      reorderLevel: input.reorderLevel,
      note: input.note,
      issuanceQuantityPolicy: input.issuanceQuantityPolicy ?? "allow-decimals",
      isActive: true,
    },
    select: itemListSelect,
  });

  return toItemListItem(item);
}

async function updateItemRecord(
  database: ItemDatabase,
  id: string,
  input: ItemInput,
) {
  const item = await database.item.update({
    where: { id },
    data: {
      name: input.name,
      normalizedName: input.normalizedName,
      categoryId: input.categoryId,
      baseUnitId: input.baseUnitId,
      reorderLevel: input.reorderLevel,
      note: input.note,
      ...(input.issuanceQuantityPolicy === undefined
        ? {}
        : { issuanceQuantityPolicy: input.issuanceQuantityPolicy }),
    },
    select: itemListSelect,
  });

  return toItemListItem(item);
}

export async function createItemWithActiveLookups(
  input: ItemInput,
): Promise<ItemCreateWriteResult> {
  return prisma.$transaction(
    async (transaction) => {
      const [conflict, { category, baseUnit }] = await Promise.all([
        findItemConflictRecord(transaction, input),
        findActiveItemLookups(transaction, input),
      ]);

      if (conflict) return { kind: "duplicate" };
      if (!category || !baseUnit) {
        return {
          kind: "invalid-lookups",
          category: Boolean(category),
          baseUnit: Boolean(baseUnit),
        };
      }

      return {
        kind: "created",
        item: await createItemRecord(transaction, input),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/** One transaction creates the catalog identity and every submitted package size. */
export async function createItemWithConversionsRecord(actor: CurrentActor, input: ItemWithConversionsInput): Promise<ItemWithConversionsResult> {
  try {
    return await prisma.$transaction(async (transaction): Promise<ItemWithConversionsResult> => {
      const administrator = await transaction.user.findFirst({ where: { id: actor.id, role: "admin", disabled: false }, select: { id: true } });
      if (!administrator) return { ok: false, kind: "forbidden", error: "Administrator access required.", fields: {} };
      const [conflict, lookups] = await Promise.all([
        findItemConflictRecord(transaction, input.item),
        findActiveItemLookups(transaction, input.item),
      ]);
      if (conflict) return { ok: false, kind: "duplicate", error: "An Item with that name already exists.", fields: { name: ["Enter a different Item name."] } };
      const fields: Record<string, string[]> = {};
      if (!lookups.category) fields.categoryId = ["Select an active Category."];
      if (!lookups.baseUnit) fields.baseUnitId = ["Select an active Base Unit."];
      const units = await transaction.unit.findMany({ where: { id: { in: input.conversions.map((entry) => entry.alternateUnitId) }, active: true }, select: { id: true } });
      const activeUnits = new Set(units.map((unit) => unit.id));
      const seen = new Set<string>();
      for (const [index, conversion] of input.conversions.entries()) {
        if (conversion.alternateUnitId === input.item.baseUnitId) fields[`conversions.${index}.alternateUnitId`] = ["The Base Unit cannot be an alternate Unit."];
        else if (!activeUnits.has(conversion.alternateUnitId)) fields[`conversions.${index}.alternateUnitId`] = ["Select an active alternate Unit."];
        const key = `${conversion.alternateUnitId}:${conversion.baseUnitQuantity}`;
        if (seen.has(key)) fields[`conversions.${index}.baseUnitQuantity`] = ["That Unit and package quantity are already included."];
        seen.add(key);
      }
      if (Object.keys(fields).length) return { ok: false, kind: "validation", error: "Please correct the highlighted Item and conversion fields.", fields };
      const item = await createItemRecord(transaction, input.item);
      if (input.conversions.length) await transaction.itemUnitConversion.createMany({ data: input.conversions.map((conversion) => ({ id: crypto.randomUUID(), itemId: item.id, ...conversion })) });
      const saved = await transaction.item.findUniqueOrThrow({ where: { id: item.id }, select: itemListSelect });
      return { ok: true, item: toItemListItem(saved) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) return { ok: false, kind: "duplicate", error: "The Item or an identical alternate-unit conversion already exists. Nothing was created.", fields: { form: ["Review the Item name and package sizes."] } };
    if ((error instanceof Error && /SQLITE_BUSY|database is locked|SocketTimeout/.test(error.message)) || (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P1008", "P2028"].includes(error.code))) return { ok: false, kind: "busy", error: "Another transaction is in progress. Nothing was created; try again.", fields: {} };
    throw error;
  }
}

export async function updateItemWithActiveLookups(
  id: string,
  input: ItemInput,
): Promise<ItemUpdateWriteResult> {
  return prisma.$transaction(
    async (transaction) => {
      const existing = await findItemRecord(transaction, id);
      if (!existing) return { kind: "not-found" };

      if (existing.baseUnitId !== input.baseUnitId) {
        if (existing._count.issuanceIngredients > 0 || existing._count.issuanceStockItems > 0) return { kind: "base-unit-locked" as const, reason: "issuance" as const };
        if (existing._count.unitConversions > 0) {
          return { kind: "base-unit-locked" as const, reason: "alternate-units" as const };
        }
        if (existing._count.deliveryReceiptLines > 0) {
          return { kind: "base-unit-locked" as const, reason: "stock-activity" as const };
        }
        if (existing._count.recipeIngredients > 0) {
          return { kind: "base-unit-locked" as const, reason: "recipe-ingredients" as const };
        }
      }

      if (existing.baseUnitId !== input.baseUnitId && input.reorderLevelBaseUnitId !== input.baseUnitId) {
        return { kind: "reorder-level-unit-required" };
      }

      const [conflict, { category, baseUnit }] = await Promise.all([
        findItemConflictRecord(transaction, input, id),
        findActiveItemLookups(transaction, input, existing),
      ]);

      if (conflict) return { kind: "duplicate" };
      if (!category || !baseUnit) {
        return {
          kind: "invalid-lookups",
          category: Boolean(category),
          baseUnit: Boolean(baseUnit),
        };
      }

      return {
        kind: "updated",
        item: await updateItemRecord(transaction, id, input),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function setItemActiveRecord(id: string, isActive: boolean) {
  return prisma.$transaction(async (transaction) => {
    if (!isActive) {
      const receiptLine = await transaction.deliveryReceiptLine.findFirst({
        where: { itemId: id },
        select: { id: true },
      });
      if (receiptLine) return { kind: "referenced" as const };
    }

    const item = await transaction.item.update({
      where: { id },
      data: { isActive },
      select: itemListSelect,
    });

    return { kind: "updated" as const, item: toItemListItem(item) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function deleteItemRecord(id: string) {
  try {
    await prisma.item.delete({ where: { id } });
  } catch (error) {
    if (isRecordNotFound(error)) return null;

    if (isRestrictiveRelationViolation(error)) {
      return { deleted: false as const, referenced: true as const };
    }

    throw error;
  }

  return { deleted: true as const };
}

export async function listItemRecords(): Promise<ItemListItem[]> {
  const items = await prisma.item.findMany({
    select: itemListSelect,
    orderBy: [{ normalizedName: "asc" }, { id: "asc" }],
  });

  return items.map(toItemListItem);
}
