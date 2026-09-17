import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { PurchaseOrderListItem } from "../../types";

const purchaseOrderListSelect = {
  id: true,
  purchaseOrderNo: true,
  referenceNumber: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  vendor: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },
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

function toPurchaseOrderListItem(
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
