import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { PurchaseOrderInput } from "../../schemas/purchase-order";
import type { PurchaseOrderDetailItem, PurchaseOrderListItem } from "../../types";

export const purchaseOrderListSelect = {
  id: true,
  purchaseOrderNo: true,
  referenceNumber: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      deliveryReceipts: true,
    },
  },
  vendor: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },
} as const;

const purchaseOrderDetailSelect = {
  ...purchaseOrderListSelect,
  deliveryReceipts: { select: { id: true, receiptNo: true, receiptDate: true, postedAt: true, _count: { select: { lines: true } } }, orderBy: { postedAt: "desc" as const } },
} as const;

type PurchaseOrderListRecord = Prisma.PurchaseOrderGetPayload<{
  select: typeof purchaseOrderListSelect;
}>;

export function isUniqueConstraintViolation(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
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

export function toPurchaseOrderListItem(
  purchaseOrder: PurchaseOrderListRecord,
): PurchaseOrderListItem {
  return {
    id: purchaseOrder.id,
    purchaseOrderNo: purchaseOrder.purchaseOrderNo,
    vendor: purchaseOrder.vendor,
    referenceNumber: purchaseOrder.referenceNumber,
    note: purchaseOrder.note,
    createdAt: purchaseOrder.createdAt.toISOString(),
    updatedAt: purchaseOrder.updatedAt.toISOString(),
    hasPostedReceipts: purchaseOrder._count.deliveryReceipts > 0,
  };
}

export async function listPurchaseOrderRecords(): Promise<PurchaseOrderListItem[]> {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    select: purchaseOrderListSelect,
    orderBy: [
      { normalizedPurchaseOrderNo: "asc" },
      { id: "asc" },
    ],
  });

  return purchaseOrders.map(toPurchaseOrderListItem);
}

export async function getPurchaseOrderRecord(
  id: string,
): Promise<PurchaseOrderDetailItem | null> {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: purchaseOrderDetailSelect,
  });

  return purchaseOrder ? {
    ...toPurchaseOrderListItem(purchaseOrder),
    deliveryReceipts: purchaseOrder.deliveryReceipts.map((receipt) => ({ id: receipt.id, receiptNo: receipt.receiptNo, receiptDate: receipt.receiptDate.toISOString(), postedAt: receipt.postedAt.toISOString(), lineCount: receipt._count.lines })),
  } : null;
}

type PurchaseOrderDatabase = Pick<
  Prisma.TransactionClient,
  "purchaseOrder" | "vendor" | "deliveryReceipt"
>;

export type PurchaseOrderCreateWriteResult =
  | { kind: "created"; purchaseOrder: PurchaseOrderListItem }
  | { kind: "duplicate" }
  | { kind: "invalid-vendor" };

export type PurchaseOrderUpdateWriteResult =
  | { kind: "updated"; purchaseOrder: PurchaseOrderListItem }
  | { kind: "duplicate" }
  | { kind: "not-found" }
  | { kind: "vendor-locked" }
  | { kind: "invalid-vendor" };

export async function createPurchaseOrderWithActiveVendor(
  input: PurchaseOrderInput,
): Promise<PurchaseOrderCreateWriteResult> {
  return prisma.$transaction(async (transaction) => {
    const database: PurchaseOrderDatabase = transaction;
    const vendor = await database.vendor.findFirst({
      where: { id: input.vendorId, isActive: true },
      select: { id: true },
    });
    if (!vendor) return { kind: "invalid-vendor" as const };

    try {
      const purchaseOrder = await database.purchaseOrder.create({
        data: {
          id: crypto.randomUUID(),
          purchaseOrderNo: input.purchaseOrderNo,
          normalizedPurchaseOrderNo: input.normalizedPurchaseOrderNo,
          vendorId: input.vendorId,
          referenceNumber: input.referenceNumber,
          note: input.note,
        },
        select: purchaseOrderListSelect,
      });

      return {
        kind: "created" as const,
        purchaseOrder: toPurchaseOrderListItem(purchaseOrder),
      };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return { kind: "duplicate" as const };
      }

      throw error;
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updatePurchaseOrderWithEligibleVendor(
  id: string,
  input: PurchaseOrderInput,
): Promise<PurchaseOrderUpdateWriteResult> {
  return prisma.$transaction(
    async (transaction) => {
      const database: PurchaseOrderDatabase = transaction;
      const existing = await database.purchaseOrder.findUnique({
        where: { id },
        select: { vendorId: true, _count: { select: { deliveryReceipts: true } } },
      });
      if (!existing) return { kind: "not-found" as const };

      if (
        existing._count.deliveryReceipts > 0 &&
        input.vendorId !== existing.vendorId
      ) {
        return { kind: "vendor-locked" as const };
      }

      const vendor = await database.vendor.findFirst({
        where: {
          id: input.vendorId,
          OR: [{ isActive: true }, { id: existing.vendorId }],
        },
        select: { id: true },
      });
      if (!vendor) return { kind: "invalid-vendor" as const };

      try {
        const purchaseOrder = await database.purchaseOrder.update({
          where: { id },
          data: {
            purchaseOrderNo: input.purchaseOrderNo,
            normalizedPurchaseOrderNo: input.normalizedPurchaseOrderNo,
            vendorId: input.vendorId,
            referenceNumber: input.referenceNumber,
            note: input.note,
          },
          select: purchaseOrderListSelect,
        });

        return {
          kind: "updated" as const,
          purchaseOrder: toPurchaseOrderListItem(purchaseOrder),
        };
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          return { kind: "duplicate" as const };
        }

        if (isRecordNotFound(error)) return { kind: "not-found" as const };
        throw error;
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function deletePurchaseOrderRecord(id: string) {
  const hasPostedReceipts = await prisma.deliveryReceipt.findFirst({
    where: { purchaseOrderId: id },
    select: { id: true },
  });
  if (hasPostedReceipts) return { deleted: false as const, referenced: true as const };

  try {
    await prisma.purchaseOrder.delete({ where: { id } });
  } catch (error) {
    if (isRecordNotFound(error)) return null;

    // Future receiving relationships must remain restrictive.
    if (isRestrictiveRelationViolation(error)) {
      return { deleted: false as const, referenced: true as const };
    }

    throw error;
  }

  return { deleted: true as const };
}
