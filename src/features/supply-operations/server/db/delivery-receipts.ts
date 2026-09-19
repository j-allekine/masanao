import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { DeliveryReceiptInput } from "../../schemas/delivery-receipt";
import { isPositiveExactDecimal, multiplyExactPositiveDecimals } from "../../domain/delivery-receipt";

export async function postDeliveryReceiptWithSelectedUnit(input: DeliveryReceiptInput) {
  return prisma.$transaction(async (database) => {
    const purchaseOrder = await database.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      select: { id: true, purchaseOrderNo: true, vendorId: true, vendor: { select: { name: true } } },
    });
    if (!purchaseOrder) return { kind: "not-found" as const };

    const item = await database.item.findFirst({
      where: { id: input.itemId, isActive: true },
      select: { id: true, name: true, baseUnitId: true, baseUnit: { select: { name: true, active: true } } },
    });
    if (!item) return { kind: "inactive-item" as const };

    const selectedUnitId = input.selectedUnitId ?? item.baseUnitId;
    const isBaseUnit = selectedUnitId === item.baseUnitId;
    const conversion = isBaseUnit || !input.conversionId
      ? null
      : await database.itemUnitConversion.findFirst({
        where: {
          id: input.conversionId,
          itemId: item.id,
          alternateUnitId: selectedUnitId,
          alternateUnit: { active: true },
        },
        select: { id: true, baseUnitQuantity: true, alternateUnit: { select: { id: true, name: true, active: true } } },
      });
    if ((isBaseUnit && (!item.baseUnit.active || input.conversionId)) || (!isBaseUnit && (!conversion || !isPositiveExactDecimal(conversion.baseUnitQuantity)))) return { kind: "invalid-unit" as const };

    const postedSelectedUnitId = conversion?.alternateUnit.id ?? item.baseUnitId;
    const selectedUnitName = conversion?.alternateUnit.name ?? item.baseUnit.name;
    const conversionFactor = conversion?.baseUnitQuantity ?? "1";
    const calculatedBaseUnitQuantity = multiplyExactPositiveDecimals(input.quantity, conversionFactor);

    try {
      const receipt = await database.deliveryReceipt.create({
        data: {
          id: crypto.randomUUID(), purchaseOrderId: purchaseOrder.id, vendorId: purchaseOrder.vendorId,
          vendorName: purchaseOrder.vendor.name, purchaseOrderNo: purchaseOrder.purchaseOrderNo,
          receiptNo: input.receiptNo, normalizedReceiptNo: input.normalizedReceiptNo,
          receiptDate: new Date(`${input.receiptDate}T00:00:00.000Z`), note: input.note,
          lines: { create: { id: crypto.randomUUID(), itemId: item.id, selectedUnitId: postedSelectedUnitId,
            baseUnitId: item.baseUnitId, itemName: item.name, selectedUnitName,
            baseUnitName: item.baseUnit.name, enteredQuantity: input.quantity, conversionFactor,
            calculatedBaseUnitQuantity, actualReceivedBaseUnitQuantity: calculatedBaseUnitQuantity,
            inventoryLedgerMovements: { create: { id: crypto.randomUUID(), itemId: item.id, baseUnitId: item.baseUnitId,
              quantity: calculatedBaseUnitQuantity, movementType: "stock-in", occurredAt: new Date(`${input.receiptDate}T00:00:00.000Z`) } },
          } },
        }, select: { id: true, receiptNo: true },
      });
      return { kind: "created" as const, receipt };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { kind: "duplicate" as const };
      throw error;
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
