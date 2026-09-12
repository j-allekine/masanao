import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

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

export async function listItemRecords(): Promise<ItemListItem[]> {
  const items = await prisma.item.findMany({
    select: itemListSelect,
    orderBy: [{ normalizedName: "asc" }, { id: "asc" }],
  });

  return items.map(toItemListItem);
}
