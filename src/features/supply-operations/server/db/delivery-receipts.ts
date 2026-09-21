import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { DeliveryReceiptInput } from "../../schemas/delivery-receipt";
import { exactDecimalsEqual, isPositiveExactDecimal, multiplyExactPositiveDecimals } from "../../domain/delivery-receipt";

export async function postDeliveryReceiptWithSelectedUnit(input: DeliveryReceiptInput) {
  return prisma.$transaction(async (database) => {
    const purchaseOrder = await database.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      select: { id: true, purchaseOrderNo: true, vendorId: true, vendor: { select: { name: true } } },
    });
    if (!purchaseOrder) return { kind: "not-found" as const };

    const postedLines = [];
    for (const [lineIndex, line] of input.lines.entries()) {
      const item = await database.item.findFirst({ where: { id: line.itemId, isActive: true }, select: { id: true, name: true, baseUnitId: true, baseUnit: { select: { name: true, active: true } } } });
      if (!item) return { kind: "inactive-item" as const, lineIndex };
      const selectedUnitId = line.selectedUnitId ?? item.baseUnitId;
      const isBaseUnit = selectedUnitId === item.baseUnitId;
      const conversion = isBaseUnit || !line.conversionId ? null : await database.itemUnitConversion.findFirst({ where: { id: line.conversionId, itemId: item.id, alternateUnitId: selectedUnitId, alternateUnit: { active: true } }, select: { baseUnitQuantity: true, alternateUnit: { select: { id: true, name: true } } } });
      if ((isBaseUnit && (!item.baseUnit.active || line.conversionId)) || (!isBaseUnit && (!conversion || !isPositiveExactDecimal(conversion.baseUnitQuantity)))) return { kind: "invalid-unit" as const, lineIndex };
      const conversionFactor = conversion?.baseUnitQuantity ?? "1";
      const calculatedBaseUnitQuantity = multiplyExactPositiveDecimals(line.quantity, conversionFactor);
      const actualReceivedBaseUnitQuantity = line.actualReceivedBaseUnitQuantity ?? calculatedBaseUnitQuantity;
      if (!exactDecimalsEqual(actualReceivedBaseUnitQuantity, calculatedBaseUnitQuantity) && !line.varianceNote) return { kind: "variance-note-required" as const, lineIndex };
      postedLines.push({ id: crypto.randomUUID(), itemId: item.id, selectedUnitId: conversion?.alternateUnit.id ?? item.baseUnitId, baseUnitId: item.baseUnitId, itemName: item.name, selectedUnitName: conversion?.alternateUnit.name ?? item.baseUnit.name, baseUnitName: item.baseUnit.name, enteredQuantity: line.quantity, conversionFactor, calculatedBaseUnitQuantity, actualReceivedBaseUnitQuantity, varianceNote: line.varianceNote, inventoryLedgerMovements: { create: { id: crypto.randomUUID(), itemId: item.id, baseUnitId: item.baseUnitId, quantity: actualReceivedBaseUnitQuantity, movementType: "stock-in", occurredAt: new Date(`${input.receiptDate}T00:00:00.000Z`) } } });
    }

    try {
      const receipt = await database.deliveryReceipt.create({
        data: {
          id: crypto.randomUUID(), purchaseOrderId: purchaseOrder.id, vendorId: purchaseOrder.vendorId,
          vendorName: purchaseOrder.vendor.name, purchaseOrderNo: purchaseOrder.purchaseOrderNo,
          receiptNo: input.receiptNo, normalizedReceiptNo: input.normalizedReceiptNo,
          receiptDate: new Date(`${input.receiptDate}T00:00:00.000Z`), note: input.note,
          lines: { create: postedLines },
        }, select: { id: true, receiptNo: true },
      });
      return { kind: "created" as const, receipt };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { kind: "duplicate" as const };
      throw error;
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
