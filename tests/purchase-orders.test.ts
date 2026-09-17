import { describe, expect, it } from "vitest";

import {
  normalizePurchaseOrderNo,
  normalizePurchaseOrderNoKey,
} from "@/features/supply-operations/domain/purchase-order";
import {
  purchaseOrderFieldErrors,
  purchaseOrderSchema,
} from "@/features/supply-operations/schemas/purchase-order";
import { listPurchaseOrders } from "@/features/supply-operations/server";
import { normalizeVendorKey } from "@/features/master-data/domain/vendor";
import { prisma } from "@/prisma/client";

async function createVendor(id: string, name: string, isActive = true) {
  return prisma.vendor.create({
    data: {
      id,
      name,
      normalizedName: normalizeVendorKey(name),
      isActive,
    },
  });
}

describe("Purchase Order input contract", () => {
  it("trims the display number, derives a case-insensitive key, and normalizes optional values", () => {
    const result = purchaseOrderSchema.parse({
      purchaseOrderNo: "  PO-2026-014  ",
      vendorId: "  vendor-1  ",
      referenceNumber: "  ORS-14  ",
      note: "   ",
    });

    expect(result).toEqual({
      purchaseOrderNo: "PO-2026-014",
      vendorId: "vendor-1",
      referenceNumber: "ORS-14",
      note: null,
      normalizedPurchaseOrderNo: "po-2026-014",
    });
    expect(normalizePurchaseOrderNo("  PO  14  ")).toBe("PO  14");
    expect(normalizePurchaseOrderNoKey("  Po-14  ")).toBe("po-14");
  });

  it("reports blank and over-limit fields without losing field locations", () => {
    const parsed = purchaseOrderSchema.safeParse({
      purchaseOrderNo: "   ",
      vendorId: " ",
      referenceNumber: "x".repeat(101),
      note: "x".repeat(501),
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(purchaseOrderFieldErrors(parsed.error)).toEqual({
      purchaseOrderNo: ["Purchase Order No. is required"],
      vendorId: ["Vendor is required"],
      referenceNumber: ["Reference number must be 100 characters or fewer"],
      note: ["Note must be 500 characters or fewer"],
    });
  });
});

describe("Purchase Orders read and persistence contract", () => {
  it("lists safe Vendor context in normalized order and preserves timestamps", async () => {
    await prisma.purchaseOrder.deleteMany();
    await prisma.vendor.deleteMany();
    await createVendor("po-vendor-zulu", "Zulu Foods");
    await createVendor("po-vendor-alpha", "Alpha Foods", false);

    await prisma.purchaseOrder.create({
      data: {
        id: "po-zulu",
        purchaseOrderNo: "PO-2",
        normalizedPurchaseOrderNo: "po-2",
        vendorId: "po-vendor-zulu",
        referenceNumber: null,
        note: null,
      },
    });
    await prisma.purchaseOrder.create({
      data: {
        id: "po-alpha",
        purchaseOrderNo: "po-1",
        normalizedPurchaseOrderNo: "po-1",
        vendorId: "po-vendor-alpha",
        referenceNumber: "ORS-1",
        note: "Historical vendor remains visible",
      },
    });

    await expect(listPurchaseOrders()).resolves.toEqual([
      expect.objectContaining({
        id: "po-alpha",
        purchaseOrderNo: "po-1",
        vendor: { id: "po-vendor-alpha", name: "Alpha Foods", isActive: false },
        referenceNumber: "ORS-1",
        note: "Historical vendor remains visible",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
      expect.objectContaining({
        id: "po-zulu",
        purchaseOrderNo: "PO-2",
        vendor: { id: "po-vendor-zulu", name: "Zulu Foods", isActive: true },
        referenceNumber: null,
        note: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    ]);
  });

  it("enforces normalized uniqueness and restrictive Vendor deletion", async () => {
    await prisma.purchaseOrder.deleteMany();
    await prisma.vendor.deleteMany();
    await createVendor("po-vendor-restrict", "Restrictive Vendor");

    await prisma.purchaseOrder.create({
      data: {
        id: "po-restrict-first",
        purchaseOrderNo: "PO-2026-014",
        normalizedPurchaseOrderNo: "po-2026-014",
        vendorId: "po-vendor-restrict",
      },
    });

    await expect(
      prisma.purchaseOrder.create({
        data: {
          id: "po-restrict-duplicate",
          purchaseOrderNo: "po-2026-014",
          normalizedPurchaseOrderNo: "po-2026-014",
          vendorId: "po-vendor-restrict",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    await expect(
      prisma.vendor.delete({ where: { id: "po-vendor-restrict" } }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
});
