import { beforeEach, describe, expect, it } from "vitest";

import {
  normalizePurchaseOrderNo,
  normalizePurchaseOrderNoKey,
} from "@/features/supply-operations/domain/purchase-order";
import {
  purchaseOrderFieldErrors,
  purchaseOrderSchema,
} from "@/features/supply-operations/schemas/purchase-order";
import {
  canManagePurchaseOrders,
  createPurchaseOrder,
  listPurchaseOrders,
} from "@/features/supply-operations/server";
import { normalizeVendorKey } from "@/features/master-data/domain/vendor";
import { filterPurchaseOrders } from "@/features/supply-operations/components/purchase-order-filters";
import {
  getPurchaseOrderListQuery,
  getPurchaseOrderListState,
  getPurchaseOrderListUrl,
} from "@/features/supply-operations/components/purchase-order-list-state";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";

const adminActor: CurrentActor = {
  id: "purchase-orders-admin",
  name: "Municipal administrator",
  username: "purchase.orders.admin",
};
const staffActor: CurrentActor = {
  id: "purchase-orders-staff",
  name: "Kitchen staff",
  username: "purchase.orders.staff",
};

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

async function createActorUser(actor: CurrentActor, role = "staff") {
  await prisma.user.create({
    data: {
      id: actor.id,
      name: actor.name,
      email: `${actor.username}@internal.masanao`,
      username: actor.username,
      role,
    },
  });
}

async function clearPurchaseOrderRecords() {
  await prisma.purchaseOrder.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
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

describe("Purchase Order list state", () => {
  const purchaseOrders = [
    {
      id: "po-zulu",
      purchaseOrderNo: "PO-2026-014",
      vendor: { id: "vendor-zulu", name: "Zulu Foods", isActive: true },
      referenceNumber: "ORS-014",
      note: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
    {
      id: "po-alpha",
      purchaseOrderNo: "PO-2026-002",
      vendor: { id: "vendor-alpha", name: "Alpha Foods", isActive: false },
      referenceNumber: "APP-002",
      note: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    },
  ];

  it("matches PO number, Vendor, and reference searches", () => {
    expect(filterPurchaseOrders(purchaseOrders, { search: "  zulu  " })).toEqual([
      purchaseOrders[0],
    ]);
    expect(filterPurchaseOrders(purchaseOrders, { search: "app-002" })).toEqual([
      purchaseOrders[1],
    ]);
    expect(filterPurchaseOrders(purchaseOrders, { search: "2026-002" })).toEqual([
      purchaseOrders[1],
    ]);
  });

  it("keeps list state in the URL while preserving unrelated parameters", () => {
    expect(getPurchaseOrderListState(new URLSearchParams(
      "view=compact&purchaseOrdersSearch=  vendor  &purchaseOrdersPage=2",
    ))).toEqual({ search: "  vendor  ", page: 2 });
    expect(
      getPurchaseOrderListQuery("view=compact", {
        search: "acme",
        page: 2,
      }),
    ).toBe("view=compact&purchaseOrdersSearch=acme&purchaseOrdersPage=2");
    expect(
      getPurchaseOrderListUrl(
        "/purchase-orders",
        "view=compact&purchaseOrdersPage=2",
        { search: "", page: 1 },
      ),
    ).toBe("/purchase-orders?view=compact");
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

describe("Purchase Order mutation gateway", () => {
  beforeEach(clearPurchaseOrderRecords);

  it("exposes the administrator capability and creates normalized records", async () => {
    await createActorUser(adminActor, "admin");
    await createActorUser(staffActor);
    const vendor = await createVendor(
      "po-create-vendor",
      "Acme Foods",
    );

    await expect(canManagePurchaseOrders(adminActor)).resolves.toBe(true);
    await expect(canManagePurchaseOrders(staffActor)).resolves.toBe(false);

    await expect(
      createPurchaseOrder(adminActor, {
        purchaseOrderNo: "  PO-2026-015  ",
        vendorId: ` ${vendor.id} `,
        referenceNumber: "  ORS-15 ",
        note: "  Receive at the kitchen dock.  ",
      }),
    ).resolves.toMatchObject({
      ok: true,
      purchaseOrder: {
        purchaseOrderNo: "PO-2026-015",
        vendor: { id: vendor.id, name: "Acme Foods", isActive: true },
        referenceNumber: "ORS-15",
        note: "Receive at the kitchen dock.",
      },
    });
  });

  it("rejects duplicates, inactive Vendors, and staff writes", async () => {
    await createActorUser(adminActor, "admin");
    await createActorUser(staffActor);
    const activeVendor = await createVendor(
      "po-active-vendor",
      "Active Foods",
    );
    const inactiveVendor = await createVendor(
      "po-inactive-vendor",
      "Inactive Foods",
      false,
    );

    await expect(
      createPurchaseOrder(adminActor, {
        purchaseOrderNo: "PO-2026-016",
        vendorId: activeVendor.id,
      }),
    ).resolves.toMatchObject({ ok: true });

    await expect(
      createPurchaseOrder(adminActor, {
        purchaseOrderNo: " po-2026-016 ",
        vendorId: activeVendor.id,
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: {
        purchaseOrderNo: ["A Purchase Order with that number already exists."],
      },
    });

    await expect(
      createPurchaseOrder(adminActor, {
        purchaseOrderNo: "PO-2026-017",
        vendorId: inactiveVendor.id,
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "inactive",
      fields: { vendorId: ["Select an active Vendor."] },
    });

    await expect(
      createPurchaseOrder(staffActor, {
        purchaseOrderNo: "PO-2026-018",
        vendorId: activeVendor.id,
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "forbidden",
      fields: {},
    });
  });
});
