import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { CategoryInput } from "../../schemas/category";
import type { CategoryListItem } from "../../types";

const categoryListSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toCategoryListItem(category: {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CategoryListItem {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
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

export async function listCategoryRecords(): Promise<CategoryListItem[]> {
  const categories = await prisma.category.findMany({
    select: categoryListSelect,
    orderBy: [{ normalizedName: "asc" }, { id: "asc" }],
  });

  return categories.map(toCategoryListItem);
}

export async function findCategoryConflictRecord(
  input: CategoryInput,
  excludeId?: string,
) {
  return prisma.category.findFirst({
    where: {
      normalizedName: input.normalizedName,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function createCategoryRecord(input: CategoryInput) {
  const category = await prisma.category.create({
    data: {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      normalizedName: input.normalizedName,
      isActive: true,
    },
    select: categoryListSelect,
  });

  return toCategoryListItem(category);
}

export async function updateCategoryRecord(
  id: string,
  input: CategoryInput,
) {
  const category = await prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      normalizedName: input.normalizedName,
    },
    select: categoryListSelect,
  });

  return toCategoryListItem(category);
}

export async function setCategoryActiveRecord(
  id: string,
  isActive: boolean,
) {
  const category = await prisma.category.update({
    where: { id },
    data: { isActive },
    select: categoryListSelect,
  });

  return toCategoryListItem(category);
}

export async function deleteCategoryRecord(id: string) {
  try {
    await prisma.category.delete({ where: { id } });
  } catch (error) {
    if (isRecordNotFound(error)) return null;

    // Future Item relationships must remain restrictive. No relationship is
    // added in this slice, but the feature keeps the explicit failure path.
    if (isRestrictiveRelationViolation(error)) {
      return { deleted: false as const, referenced: true as const };
    }

    throw error;
  }

  return { deleted: true as const };
}
