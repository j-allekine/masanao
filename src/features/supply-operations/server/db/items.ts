import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { ItemInput } from "../../schemas/item";
import type { ItemListItem, ItemUnitConversionListItem } from "../../types";
import { sortItemUnitConversions } from "../../domain/item-unit-conversion";

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
  | { kind: "base-unit-locked"; reason: "alternate-units" | "stock-activity" }
  | { kind: "invalid-lookups"; category: boolean; baseUnit: boolean };

function toItemListItem(item: ItemListRecord): ItemListItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    baseUnit: item.baseUnit,
    note: item.note,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    unitConversions: sortItemUnitConversions(item.unitConversions.map((conversion) => ({
      id: conversion.id,
      alternateUnit: conversion.alternateUnit,
      baseUnitQuantity: conversion.baseUnitQuantity,
      label: `${conversion.alternateUnit.name} (${conversion.baseUnitQuantity} ${item.baseUnit.abbreviation})`,
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
    label: `${conversion.alternateUnit.name} (${conversion.baseUnitQuantity} ${conversion.item.baseUnit.abbreviation})`,
  };
}

export async function createItemUnitConversionRecord(input: {
  itemId: string;
  alternateUnitId: string;
  baseUnitQuantity: string;
}) {
  return prisma.$transaction(async (transaction) => {
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
      _count: { select: { unitConversions: true, deliveryReceiptLines: true } },
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
      note: input.note,
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
      note: input.note,
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

export async function updateItemWithActiveLookups(
  id: string,
  input: ItemInput,
): Promise<ItemUpdateWriteResult> {
  return prisma.$transaction(
    async (transaction) => {
      const existing = await findItemRecord(transaction, id);
      if (!existing) return { kind: "not-found" };

      if (existing.baseUnitId !== input.baseUnitId) {
        if (existing._count.unitConversions > 0) {
          return { kind: "base-unit-locked" as const, reason: "alternate-units" as const };
        }
        if (existing._count.deliveryReceiptLines > 0) {
          return { kind: "base-unit-locked" as const, reason: "stock-activity" as const };
        }
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
