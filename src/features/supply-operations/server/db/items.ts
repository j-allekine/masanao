import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { ItemInput } from "../../schemas/item";
import type { CategoryListItem, ItemListItem, UnitListItem } from "../../types";

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
  };
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
  const item = await prisma.item.update({
    where: { id },
    data: { isActive },
    select: itemListSelect,
  });

  return toItemListItem(item);
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

export async function listItemCategoryLookups(): Promise<CategoryListItem[]> {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, description: true, isActive: true, createdAt: true, updatedAt: true },
    orderBy: [{ normalizedName: "asc" }, { id: "asc" }],
  });

  return categories.map((category) => ({
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }));
}

export async function listItemUnitLookups(): Promise<UnitListItem[]> {
  return prisma.unit.findMany({
    select: { id: true, name: true, abbreviation: true, active: true },
    orderBy: [{ normalizedName: "asc" }, { normalizedAbbreviation: "asc" }, { id: "asc" }],
  });
}
