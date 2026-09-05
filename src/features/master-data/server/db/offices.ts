import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { OfficeInput } from "../../schemas/office";
import type { OfficeListItem } from "../../types";

const officeListSelect = {
  id: true,
  name: true,
  abbreviation: true,
  headName: true,
  headDesignation: true,
  officialEmail: true,
  contactNumber: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toOfficeListItem(office: {
  id: string;
  name: string;
  abbreviation: string | null;
  headName: string | null;
  headDesignation: string | null;
  officialEmail: string | null;
  contactNumber: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): OfficeListItem {
  return {
    ...office,
    createdAt: office.createdAt.toISOString(),
    updatedAt: office.updatedAt.toISOString(),
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

export function getOfficeDuplicateField(error: unknown) {
  if (!isUniqueConstraintViolation(error)) return null;

  const target = error.meta?.target;
  const fields = Array.isArray(target)
    ? target.filter((field): field is string => typeof field === "string")
    : typeof target === "string"
      ? [target]
      : [];
  const normalizedFields = fields.map((field) => field.toLowerCase());

  if (
    normalizedFields.some(
      (field) => field.includes("abbreviation") || field.includes("office_abbreviation"),
    )
  ) {
    return "abbreviation" as const;
  }

  if (
    normalizedFields.some(
      (field) => field.includes("name") || field.includes("office_name"),
    )
  ) {
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

export async function findOfficeConflictRecord(
  input: OfficeInput,
  excludeId?: string,
) {
  const nameConflicts = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "office"
    WHERE "name" COLLATE NOCASE = ${input.name}
    LIMIT 1
  `;

  if (nameConflicts.some(({ id }) => id !== excludeId)) {
    return "name" as const;
  }

  if (input.abbreviation === null) return null;

  const abbreviationConflicts = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "office"
    WHERE "abbreviation" COLLATE NOCASE = ${input.abbreviation}
    LIMIT 1
  `;

  if (abbreviationConflicts.some(({ id }) => id !== excludeId)) {
    return "abbreviation" as const;
  }

  return null;
}

export async function createOfficeRecord(input: OfficeInput) {
  const office = await prisma.office.create({
    data: {
      id: crypto.randomUUID(),
      name: input.name,
      abbreviation: input.abbreviation,
      headName: input.headName,
      headDesignation: input.headDesignation,
      officialEmail: input.officialEmail,
      contactNumber: input.contactNumber,
    },
    select: officeListSelect,
  });

  return toOfficeListItem(office);
}

export async function updateOfficeRecord(id: string, input: OfficeInput) {
  const office = await prisma.office.update({
    where: { id },
    data: {
      name: input.name,
      abbreviation: input.abbreviation,
      headName: input.headName,
      headDesignation: input.headDesignation,
      officialEmail: input.officialEmail,
      contactNumber: input.contactNumber,
    },
    select: officeListSelect,
  });

  return toOfficeListItem(office);
}

export async function setOfficeActiveRecord(id: string, isActive: boolean) {
  const office = await prisma.office.update({
    where: { id },
    data: { isActive },
    select: officeListSelect,
  });

  return toOfficeListItem(office);
}

export async function deleteOfficeRecord(id: string) {
  try {
    await prisma.office.delete({ where: { id } });
  } catch (error) {
    if (isRecordNotFound(error)) return null;

    // The future Activity relation must remain restrictive. No relationship is
    // added in this slice, but the feature keeps the explicit failure path.
    if (isRestrictiveRelationViolation(error)) {
      return { deleted: false as const, referenced: true as const };
    }

    throw error;
  }

  return { deleted: true as const };
}

export async function listOfficeRecords(): Promise<OfficeListItem[]> {
  const offices = await prisma.office.findMany({
    select: officeListSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  return offices.map(toOfficeListItem);
}
