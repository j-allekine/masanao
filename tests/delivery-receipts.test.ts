import { beforeEach, describe, expect, it } from "vitest";

import { deliveryReceiptSchema } from "@/features/supply-operations/schemas/delivery-receipt";
import { multiplyExactPositiveDecimals } from "@/features/supply-operations/domain/delivery-receipt";
import { postDeliveryReceipt, setItemActive, updateItem } from "@/features/supply-operations/server";
import { normalizeVendorKey } from "@/features/master-data/domain/vendor";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";

const staff: CurrentActor = { id: "receipt-staff", name: "Kitchen staff", username: "receipt.staff" };
const administrator: CurrentActor = { id: "receipt-admin", name: "Receipt administrator", username: "receipt.admin" };

async function clearRecords() {
  await prisma.inventoryLedgerMovement.deleteMany();
  await prisma.deliveryReceiptLine.deleteMany();
  await prisma.deliveryReceipt.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.itemUnitConversion.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.vendor.deleteMany();
}

async function receiptContext(vendorId = "receipt-vendor") {
  await prisma.vendor.create({ data: { id: vendorId, name: vendorId, normalizedName: normalizeVendorKey(vendorId) } });
  await prisma.purchaseOrder.create({ data: { id: `${vendorId}-po`, purchaseOrderNo: `${vendorId}-po`, normalizedPurchaseOrderNo: `${vendorId}-po`, vendorId } });
  await prisma.unit.create({ data: { id: `${vendorId}-unit`, name: "Kilogram", abbreviation: "kg", normalizedName: `${vendorId}-unit`, normalizedAbbreviation: `${vendorId}-kg` } });
  await prisma.category.create({ data: { id: `${vendorId}-category`, name: `${vendorId}-category`, normalizedName: `${vendorId}-category` } });
  await prisma.item.create({ data: { id: `${vendorId}-item`, name: "Rice", normalizedName: `${vendorId}-item`, categoryId: `${vendorId}-category`, baseUnitId: `${vendorId}-unit` } });
  return { purchaseOrderId: `${vendorId}-po`, itemId: `${vendorId}-item` };
}

beforeEach(clearRecords);

describe("Delivery Receipt direct Base Unit posting", () => {
  it("normalizes the Vendor-scoped receipt key and validates the direct quantity", () => {
    expect(deliveryReceiptSchema.parse({ purchaseOrderId: "po", receiptNo: " DR-1 ", receiptDate: "2026-09-19", itemId: "item", quantity: "2.50" })).toMatchObject({ receiptNo: "DR-1", normalizedReceiptNo: "dr-1", quantity: "2.50" });
    expect(deliveryReceiptSchema.safeParse({ purchaseOrderId: "po", receiptNo: "DR-1", receiptDate: "2026-09-19", itemId: "item", quantity: "0" }).success).toBe(false);
  });

  it("posts a receipt, immutable direct line, and matching stock-in together", async () => {
    const { purchaseOrderId, itemId } = await receiptContext();
    await expect(postDeliveryReceipt(staff, { purchaseOrderId, itemId, receiptNo: " DR-10 ", receiptDate: "2026-09-19", quantity: "12.5", note: " Kitchen dock " })).resolves.toMatchObject({ ok: true, receipt: { receiptNo: "DR-10" } });
    await expect(prisma.deliveryReceipt.findMany({ include: { lines: { include: { inventoryLedgerMovements: true } } } })).resolves.toMatchObject([{ vendorName: "receipt-vendor", purchaseOrderNo: "receipt-vendor-po", normalizedReceiptNo: "dr-10", note: "Kitchen dock", lines: [{ itemName: "Rice", selectedUnitName: "Kilogram", conversionFactor: "1", enteredQuantity: "12.5", calculatedBaseUnitQuantity: "12.5", actualReceivedBaseUnitQuantity: "12.5", inventoryLedgerMovements: [{ movementType: "stock-in", quantity: "12.5" }] }] }]);
  });

  it("rejects a duplicate only for the same Vendor without partial writes", async () => {
    const first = await receiptContext("first-vendor");
    const second = await receiptContext("second-vendor");
    await postDeliveryReceipt(staff, { ...first, receiptNo: "DR-20", receiptDate: "2026-09-19", quantity: "1" });
    await expect(postDeliveryReceipt(staff, { ...first, receiptNo: " dr-20 ", receiptDate: "2026-09-19", quantity: "1" })).resolves.toMatchObject({ ok: false, kind: "duplicate" });
    await expect(postDeliveryReceipt(staff, { ...second, receiptNo: "dr-20", receiptDate: "2026-09-19", quantity: "1" })).resolves.toMatchObject({ ok: true });
    await expect(prisma.inventoryLedgerMovement.count()).resolves.toBe(2);
  });

  it("prevents Item deactivation and Base Unit changes after posting", async () => {
    const { purchaseOrderId, itemId } = await receiptContext();
    await prisma.user.create({ data: { id: administrator.id, name: administrator.name, email: "receipt.admin@internal.masanao", username: administrator.username, role: "admin" } });
    const replacementUnit = await prisma.unit.create({ data: { id: "receipt-replacement-unit", name: "Piece", abbreviation: "pc", normalizedName: "piece", normalizedAbbreviation: "pc" } });

    await expect(postDeliveryReceipt(staff, { purchaseOrderId, itemId, receiptNo: "DR-30", receiptDate: "2026-09-19", quantity: "1" })).resolves.toMatchObject({ ok: true });

    await expect(setItemActive(administrator, itemId, false)).resolves.toEqual({
      ok: false,
      kind: "referenced",
      error: "This Item cannot be deactivated because posted Delivery Receipts reference it.",
    });
    await expect(updateItem(administrator, itemId, {
      name: "Rice",
      categoryId: "receipt-vendor-category",
      baseUnitId: replacementUnit.id,
    })).resolves.toMatchObject({
      ok: false,
      kind: "validation",
      fields: {
        baseUnitId: ["Base Unit cannot change after stock activity is posted."],
      },
    });
    await expect(prisma.item.findUnique({ where: { id: itemId } })).resolves.toMatchObject({
      isActive: true,
      baseUnitId: "receipt-vendor-unit",
    });
  });
});

describe("Delivery Receipt alternate Unit posting", () => {
  it("calculates positive exact decimals without floating point rounding", () => {
    expect(multiplyExactPositiveDecimals("2.50", "25")).toBe("62.5");
    expect(multiplyExactPositiveDecimals("0.1", "0.2")).toBe("0.02");
    expect(multiplyExactPositiveDecimals("12345678901234567890.1", "2")).toBe("24691357802469135780.2");
  });

  it("posts an active configured alternate Unit using immutable calculation snapshots", async () => {
    const { purchaseOrderId, itemId } = await receiptContext("alternate-vendor");
    await prisma.unit.create({ data: { id: "alternate-vendor-sack", name: "Sack", abbreviation: "sack", normalizedName: "alternate-vendor-sack", normalizedAbbreviation: "alternate-vendor-sack-abbr" } });
    await prisma.itemUnitConversion.create({ data: { id: "alternate-vendor-conversion", itemId, alternateUnitId: "alternate-vendor-sack", baseUnitQuantity: "25" } });

    await expect(postDeliveryReceipt(staff, { purchaseOrderId, itemId, selectedUnitId: "alternate-vendor-sack", conversionId: "alternate-vendor-conversion", receiptNo: "DR-ALT-1", receiptDate: "2026-09-19", quantity: "2.50" })).resolves.toMatchObject({ ok: true });
    await expect(prisma.deliveryReceiptLine.findFirstOrThrow({ include: { inventoryLedgerMovements: true } })).resolves.toMatchObject({
      itemName: "Rice", selectedUnitName: "Sack", baseUnitName: "Kilogram", enteredQuantity: "2.50", conversionFactor: "25", calculatedBaseUnitQuantity: "62.5", actualReceivedBaseUnitQuantity: "62.5", inventoryLedgerMovements: [{ quantity: "62.5", movementType: "stock-in" }],
    });
  });

  it("rejects inactive or mismatched alternate Units without posting anything", async () => {
    const { purchaseOrderId, itemId } = await receiptContext("unavailable-vendor");
    await prisma.unit.create({ data: { id: "unavailable-vendor-sack", name: "Sack", abbreviation: "sack", normalizedName: "unavailable-vendor-sack", normalizedAbbreviation: "unavailable-vendor-sack-abbr", active: false } });
    await prisma.itemUnitConversion.create({ data: { id: "unavailable-vendor-conversion", itemId, alternateUnitId: "unavailable-vendor-sack", baseUnitQuantity: "25" } });

    await expect(postDeliveryReceipt(staff, { purchaseOrderId, itemId, selectedUnitId: "unavailable-vendor-sack", conversionId: "unavailable-vendor-conversion", receiptNo: "DR-ALT-2", receiptDate: "2026-09-19", quantity: "1" })).resolves.toMatchObject({ ok: false, kind: "inactive", fields: { selectedUnitId: expect.any(Array) } });
    await expect(prisma.deliveryReceipt.count()).resolves.toBe(0);
    await expect(prisma.inventoryLedgerMovement.count()).resolves.toBe(0);
  });
});
