import "server-only";
import { prisma } from "@/prisma/client";
import type { Prisma } from "@/prisma/generated/client";
import { isPositiveExactDecimal } from "@/features/supply-operations/domain/delivery-receipt";
import type { IssuanceStockItem, IssuanceStockItemOption } from "../../types";

type StockDatabase = Pick<Prisma.TransactionClient, "item">;

export async function listIssuanceStockItemOptionRecords(database: StockDatabase = prisma): Promise<IssuanceStockItemOption[]> {
  const items = await database.item.findMany({
    where: { isActive: true, baseUnit: { active: true } },
    include: { baseUnit: true, unitConversions: { where: { alternateUnit: { active: true } }, include: { alternateUnit: true }, orderBy: { id: "asc" } } },
    orderBy: { normalizedName: "asc" },
  });
  return items.map((item) => ({
    id: item.id, name: item.name,
    baseUnit: { id: item.baseUnit.id, name: item.baseUnit.name, abbreviation: item.baseUnit.abbreviation },
    conversions: item.unitConversions.filter((conversion) => isPositiveExactDecimal(conversion.baseUnitQuantity)).map((conversion) => ({
      id: conversion.id, factor: conversion.baseUnitQuantity,
      alternateUnit: { id: conversion.alternateUnit.id, name: conversion.alternateUnit.name, abbreviation: conversion.alternateUnit.abbreviation },
    })),
  }));
}

// Revalidate deliberate selections inside the save transaction. Historical
// lines deliberately carry a copied factor rather than a conversion foreign key.
export async function getIssuanceStockSelectionRecord(itemId: string, conversionId: string | null, database: StockDatabase = prisma): Promise<Omit<IssuanceStockItem, "id" | "enteredQuantity"> | null> {
  const item = await database.item.findUnique({ where: { id: itemId }, include: { baseUnit: true, unitConversions: { include: { alternateUnit: true } } } });
  if (!item?.isActive || !item.baseUnit.active) return null;
  const conversion = conversionId === null ? null : item.unitConversions.find((candidate) => candidate.id === conversionId);
  if (conversionId !== null && (!conversion || !conversion.alternateUnit.active || !isPositiveExactDecimal(conversion.baseUnitQuantity))) return null;
  const selected = conversion?.alternateUnit ?? item.baseUnit;
  return {
    itemId: item.id, itemName: item.name, conversionId,
    conversionFactor: conversion?.baseUnitQuantity ?? "1",
    selectedUnitId: selected.id, selectedUnitName: selected.name, selectedUnitAbbreviation: selected.abbreviation,
    baseUnitId: item.baseUnit.id, baseUnitName: item.baseUnit.name, baseUnitAbbreviation: item.baseUnit.abbreviation,
  };
}

