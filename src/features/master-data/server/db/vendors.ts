import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { VendorInput } from "../../schemas/vendor";
import type { VendorListItem } from "../../types";

const vendorListSelect = {
  id: true,
  name: true,
  contactPerson: true,
  contactNumber: true,
  email: true,
  address: true,
  isActive: true,
} as const;

export async function listVendorRecords(): Promise<VendorListItem[]> {
  return prisma.vendor.findMany({
    select: vendorListSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

export function isUniqueConstraintViolation(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function getVendorDuplicateField(error: unknown) {
  if (!isUniqueConstraintViolation(error)) return null;

  const target = error.meta?.target;
  const fields = Array.isArray(target)
    ? target.filter((field): field is string => typeof field === "string")
    : typeof target === "string"
      ? [target]
      : [];

  if (
    fields.some((field) => field.toLowerCase().includes("name")) ||
    error.message.toLowerCase().includes("vendor_name_nocase")
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

export async function findVendorConflictRecord(
  input: VendorInput,
  excludeId?: string,
) {
  const conflicts = excludeId
    ? await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "vendor"
        WHERE "name" = ${input.name} COLLATE NOCASE
          AND "id" <> ${excludeId}
        LIMIT 1
      `
    : await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "vendor"
        WHERE "name" = ${input.name} COLLATE NOCASE
        LIMIT 1
      `;

  return conflicts.length > 0;
}

export async function createVendorRecord(input: VendorInput) {
  return prisma.vendor.create({
    data: {
      id: crypto.randomUUID(),
      name: input.name,
      contactPerson: input.contactPerson,
      contactNumber: input.contactNumber,
      email: input.email,
      address: input.address,
    },
    select: vendorListSelect,
  });
}

export async function updateVendorRecord(id: string, input: VendorInput) {
  return prisma.vendor.update({
    where: { id },
    data: {
      name: input.name,
      contactPerson: input.contactPerson,
      contactNumber: input.contactNumber,
      email: input.email,
      address: input.address,
    },
    select: vendorListSelect,
  });
}
