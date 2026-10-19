import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/client";
import { listInventory, postDeliveryReceipt } from "@/features/supply-operations/server";
import { getIssuanceReviewReferences, postIssuance, saveIssuanceDraft } from "@/features/issuance/server";

const staff = { id: "inv-staff", name: "Staff", username: "invstaff" };
const admin = { id: "inv-admin", name: "Admin", username: "invadmin" };
const context = { activityDesignId: "inv-design", activityId: "inv-activity", mealScheduleId: "inv-meal" };
async function rows() { const result = await listInventory(staff); if (!result.ok) throw Error(result.error); return result.rows; }

beforeAll(async () => {
  await prisma.user.createMany({ data: [staff, admin].map((actor) => ({ ...actor, email: `${actor.id}@test.local`, role: actor === admin ? "admin" : "staff" })) });
  await prisma.category.create({ data: { id: "inv-category", name: "Food", normalizedName: "food" } });
  await prisma.unit.createMany({ data: [{ id: "inv-pc", name: "Piece", normalizedName: "inventory piece", abbreviation: "pc", normalizedAbbreviation: "inv-pc" }, { id: "inv-tray", name: "Tray", normalizedName: "inventory tray", abbreviation: "tray", normalizedAbbreviation: "inv-tray" }] });
  await prisma.item.createMany({ data: ["Eggs", "Never received", "Inactive", "Tiny", "Malformed", "Negative", "Bad direction", "Bad level"].map((name) => ({ id: `inv-${name}`, name, normalizedName: name.toLowerCase(), categoryId: "inv-category", baseUnitId: "inv-pc", reorderLevel: "10", isActive: name !== "Inactive" })) });
  await prisma.itemUnitConversion.create({ data: { id: "inv-conversion", itemId: "inv-Eggs", alternateUnitId: "inv-tray", baseUnitQuantity: "10" } });
  await prisma.vendor.create({ data: { id: "inv-vendor", name: "Vendor", normalizedName: "vendor" } });
  await prisma.purchaseOrder.create({ data: { id: "inv-po", purchaseOrderNo: "INV-PO", normalizedPurchaseOrderNo: "inv-po", vendorId: "inv-vendor" } });
  await prisma.activityDesign.create({ data: { id: context.activityDesignId, activityDesignNo: "AD-INV", fiscalYear: 2026, title: "Training" } });
  await prisma.activity.create({ data: { id: context.activityId, activityDesignId: context.activityDesignId, name: "Training", officeName: "Kitchen", scheduledDate: new Date(), plannedParticipantCount: 1 } });
  await prisma.mealSchedule.create({ data: { id: context.mealScheduleId, activityId: context.activityId, label: "Lunch", mealTime: "12:00" } });
});

describe("Authorized exact Inventory public reads", () => {
  it("includes never-received active Items, then follows converted receipt, draft and posted issuance without subtracting FIFO twice", async () => {
    expect((await rows()).find((row) => row.name === "Eggs")).toMatchObject({ balance: { quantity: "0" }, stockStatus: "out-of-stock" });
    expect((await rows()).find((row) => row.name === "Never received")).toMatchObject({ balance: { quantity: "0" }, stockStatus: "out-of-stock" });
    expect((await rows()).some((row) => row.name === "Inactive")).toBe(false);
    expect(await postDeliveryReceipt(staff, { purchaseOrderId: "inv-po", receiptNo: "INV-DR", receiptDate: "2026-10-19", lines: [{ itemId: "inv-Eggs", conversionId: "inv-conversion", selectedUnitId: "inv-tray", quantity: "2", unitPrice: "1" }] })).toMatchObject({ ok: true });
    expect((await rows()).find((row) => row.name === "Eggs")).toMatchObject({ balance: { quantity: "20" }, stockStatus: "good" });
    const draft = await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 1, recipes: [], stockItems: [{ itemId: "inv-Eggs", enteredQuantity: "10", conversionId: null }] });
    expect(draft.ok).toBe(true); if (!draft.ok) throw Error(draft.error);
    expect((await rows()).find((row) => row.name === "Eggs")?.balance).toEqual({ kind: "valid", quantity: "20" });
    expect(await postIssuance(staff, context, { revision: draft.value.draft.revision })).toMatchObject({ ok: true });
    expect(await prisma.issuanceReceiptAllocation.count()).toBe(1);
    expect((await rows()).find((row) => row.name === "Eggs")).toMatchObject({ balance: { quantity: "10" }, stockStatus: "reorder-now" });
    expect(await getIssuanceReviewReferences(staff, ["inv-Eggs"])).toMatchObject({ ok: true, value: [{ availableQuantity: "10" }] });
    await prisma.category.update({ where: { id: "inv-category" }, data: { isActive: false } });
    await prisma.unit.update({ where: { id: "inv-pc" }, data: { active: false } });
    expect((await rows()).find((row) => row.name === "Eggs")).toMatchObject({ balance: { quantity: "10" }, category: { name: "Food" }, baseUnit: { abbreviation: "pc" } });
  });

  it("compares tiny and large decimals exactly and isolates malformed, negative and unknown evidence", async () => {
    // Simulate damaged historical/imported evidence; application writes retain constraints.
    await prisma.$executeRawUnsafe("PRAGMA ignore_check_constraints = ON");
    await prisma.inventoryLedgerMovement.createMany({ data: [
      { itemId: "inv-Tiny", quantity: "0.000000000000000001", movementType: "stock-in" },
      { itemId: "inv-Malformed", quantity: "1e3", movementType: "stock-in" },
      { itemId: "inv-Negative", quantity: "1", movementType: "stock-out" },
      { itemId: "inv-Bad direction", quantity: "1", movementType: "unknown" },
    ].map((row) => ({ ...row, id: crypto.randomUUID(), baseUnitId: "inv-pc", occurredAt: new Date() })) });
    await prisma.$executeRawUnsafe("PRAGMA ignore_check_constraints = OFF");
    await prisma.item.update({ where: { id: "inv-Tiny" }, data: { reorderLevel: "0.000000000000000001" } });
    await prisma.item.update({ where: { id: "inv-Bad level" }, data: { reorderLevel: "0" } });
    const result = await rows();
    expect(result.find((row) => row.name === "Tiny")).toMatchObject({ balance: { quantity: "0.000000000000000001" }, stockStatus: "reorder-now" });
    for (const name of ["Malformed", "Negative", "Bad direction"]) expect(result.find((row) => row.name === name)).toMatchObject({ balance: { kind: "invalid" }, stockStatus: "review-required" });
    expect(result.find((row) => row.name === "Bad level")?.stockStatus).toBe("review-required");
    await expect(getIssuanceReviewReferences(staff, ["inv-Malformed"])).rejects.toThrow("Invalid stock evidence");
    await expect(getIssuanceReviewReferences(staff, ["inv-Negative"])).rejects.toThrow("Negative stock balance");
    await prisma.item.update({ where: { id: "inv-Tiny" }, data: { reorderLevel: "0.0000000000000000009" } });
    expect((await rows()).find((row) => row.name === "Tiny")?.stockStatus).toBe("good");
    await prisma.inventoryLedgerMovement.updateMany({ where: { itemId: "inv-Tiny" }, data: { quantity: "9007199254740993.000000000000000001" } });
    await prisma.item.update({ where: { id: "inv-Tiny" }, data: { reorderLevel: "9007199254740993.000000000000000002" } });
    expect((await rows()).find((row) => row.name === "Tiny")?.stockStatus).toBe("reorder-now");
    await prisma.inventoryLedgerMovement.updateMany({ where: { itemId: "inv-Tiny" }, data: { quantity: "-1" } });
    expect((await rows()).find((row) => row.name === "Tiny")?.stockStatus).toBe("review-required");
  });

  it("requires a persisted enabled staff or admin account", async () => {
    expect(await listInventory(null)).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await listInventory({ ...staff, id: "missing" })).toMatchObject({ ok: false });
    expect(await listInventory(admin)).toMatchObject({ ok: true });
    await prisma.user.update({ where: { id: staff.id }, data: { role: "viewer" } });
    expect(await listInventory(staff)).toMatchObject({ ok: false });
    await prisma.user.update({ where: { id: staff.id }, data: { role: "staff", disabled: true } });
    expect(await listInventory(staff)).toMatchObject({ ok: false });
    await prisma.user.update({ where: { id: admin.id }, data: { disabled: true } });
    expect(await listInventory(admin)).toMatchObject({ ok: false });
  });
});



