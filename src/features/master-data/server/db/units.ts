import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { UnitInput } from "../../schemas/unit";
import type { UnitListItem } from "../../types";

const unitListSelect = {
  id: true,
  name: true,
  abbreviation: true,
  active: true,
} as const;

function toUnitListItem(unit: {
  id: string;
  name: string;
  abbreviation: string;
  active: boolean;
}): UnitListItem {
  return unit;
}

export function isUniqueConstraintViolation(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function getUnitDuplicateField(error: unknown) {
  if (!isUniqueConstraintViolation(error)) return null;

  const target = error.meta?.target;
  const fields = Array.isArray(target)
    ? target.filter((field): field is string => typeof field === "string")
    : typeof target === "string"
      ? [target]
      : [];
  const normalizedFields = fields.map((field) => field.toLowerCase());

  if (normalizedFields.some((field) => field.includes("abbreviation"))) {
    return "abbreviation" as const;
  }

  if (normalizedFields.some((field) => field.includes("name"))) {
    return "name" as const;
  }

  return null;
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

export async function findUnitActorRole(actorId: string) {
  return prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });
}

export async function listUnitRecords(): Promise<UnitListItem[]> {
  const units = await prisma.unit.findMany({
    select: unitListSelect,
    orderBy: [
      { normalizedName: "asc" },
      { normalizedAbbreviation: "asc" },
      { id: "asc" },
    ],
  });

  return units.map(toUnitListItem);
}

export async function findUnitConflictRecord(
  input: UnitInput,
  excludeId?: string,
) {
  const unit = await prisma.unit.findFirst({
    where: {
      OR: [
        { normalizedName: input.normalizedName },
        { normalizedAbbreviation: input.normalizedAbbreviation },
      ],
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: {
      normalizedName: true,
      normalizedAbbreviation: true,
    },
  });

  if (!unit) return null;
  if (unit.normalizedName === input.normalizedName) return "name" as const;
  return "abbreviation" as const;
}

export async function createUnitRecord(input: UnitInput) {
  const unit = await prisma.unit.create({
    data: {
      id: crypto.randomUUID(),
      name: input.name,
      abbreviation: input.abbreviation,
      normalizedName: input.normalizedName,
      normalizedAbbreviation: input.normalizedAbbreviation,
    },
    select: unitListSelect,
  });

  return toUnitListItem(unit);
}

export async function updateUnitRecord(id: string, input: UnitInput) {
  const unit = await prisma.unit.update({
    where: { id },
    data: {
      name: input.name,
      abbreviation: input.abbreviation,
      normalizedName: input.normalizedName,
      normalizedAbbreviation: input.normalizedAbbreviation,
    },
    select: unitListSelect,
  });

  return toUnitListItem(unit);
}

export async function setUnitActiveRecord(id: string, active: boolean) {
  const unit = await prisma.unit.update({
    where: { id },
    data: { active },
    select: unitListSelect,
  });

  return toUnitListItem(unit);
}

export async function deleteUnitRecord(id: string) {
  try {
    await prisma.unit.delete({ where: { id } });
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
