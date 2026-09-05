import "server-only";

import { prisma } from "@/prisma/client";

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
