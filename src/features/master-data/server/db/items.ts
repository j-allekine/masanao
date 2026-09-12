import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { ItemInput } from "../../schemas/item";
import type { ItemListItem } from "../../types";

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

export async function findItemRecord(id: string) {
  return prisma.item.findUnique({
    where: { id },
    select: {
      id: true,
      categoryId: true,
      baseUnitId: true,
    },
  });
}

export async function findItemConflictRecord(
  input: ItemInput,
  excludeId?: string,
) {
  return prisma.item.findFirst({
    where: {
      normalizedName: input.normalizedName,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function findActiveItemLookups(
  input: ItemInput,
  existing?: { categoryId: string; baseUnitId: string },
) {
  const [category, baseUnit] = await Promise.all([
    prisma.category.findFirst({
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
    prisma.unit.findFirst({
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

export async function createItemRecord(input: ItemInput) {
  const item = await prisma.item.create({
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

export async function updateItemRecord(id: string, input: ItemInput) {
  const item = await prisma.item.update({
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

export async function listItemRecords(): Promise<ItemListItem[]> {
  const items = await prisma.item.findMany({
    select: itemListSelect,
    orderBy: [{ normalizedName: "asc" }, { id: "asc" }],
  });

  return items.map(toItemListItem);
}
