import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { DeliveryReceiptInput } from "../../schemas/delivery-receipt";

export async function postDirectBaseUnitDeliveryReceipt(input: DeliveryReceiptInput) {
  return prisma.$transaction(async (database) => {
    const purchaseOrder = await database.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      select: { id: true, purchaseOrderNo: true, vendorId: true, vendor: { select: { name: true } } },
    });
    if (!purchaseOrder) return { kind: "not-found" as const };

    const item = await database.item.findFirst({
      where: { id: input.itemId, isActive: true },
      select: { id: true, name: true, baseUnitId: true, baseUnit: { select: { name: true } } },
    });
    if (!item) return { kind: "inactive-item" as const };

    try {
      const receipt = await database.deliveryReceipt.create({
        data: {
          id: crypto.randomUUID(), purchaseOrderId: purchaseOrder.id, vendorId: purchaseOrder.vendorId,
          vendorName: purchaseOrder.vendor.name, purchaseOrderNo: purchaseOrder.purchaseOrderNo,
          receiptNo: input.receiptNo, normalizedReceiptNo: input.normalizedReceiptNo,
          receiptDate: new Date(`${input.receiptDate}T00:00:00.000Z`), note: input.note,
          lines: { create: { id: crypto.randomUUID(), itemId: item.id, selectedUnitId: item.baseUnitId,
            baseUnitId: item.baseUnitId, itemName: item.name, selectedUnitName: item.baseUnit.name,
            baseUnitName: item.baseUnit.name, enteredQuantity: input.quantity, conversionFactor: "1",
            calculatedBaseUnitQuantity: input.quantity, actualReceivedBaseUnitQuantity: input.quantity,
            inventoryLedgerMovements: { create: { id: crypto.randomUUID(), itemId: item.id, baseUnitId: item.baseUnitId,
              quantity: input.quantity, movementType: "stock-in", occurredAt: new Date(`${input.receiptDate}T00:00:00.000Z`) } },
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
