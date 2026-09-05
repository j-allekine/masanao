import "server-only";

import { prisma } from "@/prisma/client";

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

export async function listOfficeRecords(): Promise<OfficeListItem[]> {
  const offices = await prisma.office.findMany({
    select: officeListSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  return offices.map(toOfficeListItem);
}
