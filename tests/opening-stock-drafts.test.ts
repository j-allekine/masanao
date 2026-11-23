import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/client";
import { beginOpeningStock, discardOpeningStockDraft, getOpeningStockWorkspace, postDeliveryReceipt, saveOpeningStockDraft } from "@/features/supply-operations/server";
import { postIssuance } from "@/features/issuance/server";
import type { OpeningStockResult } from "@/features/supply-operations/opening-stock-types";
import { openingStockToday, openingStockUnitSelection } from "@/features/supply-operations/domain/opening-stock";

function value<T>(result: OpeningStockResult<T>) { if (!result.ok) throw new Error(result.error); return result.value; }
async function fixture() {
  const key = crypto.randomUUID();
  const admin = { id: `admin-${key}`, name: "Count administrator", username: `admin-${key}` };
  const staff = { id: `staff-${key}`, name: "Kitchen staff", username: `staff-${key}` };
  await prisma.user.createMany({ data: [admin, staff].map((actor) => ({ ...actor, email: `${actor.id}@test.local`, role: actor === admin ? "admin" : "staff" })) });
  const category = await prisma.category.create({ data: { id: `cat-${key}`, name: `Count ${key}`, normalizedName: `count ${key}` } });
  const base = await prisma.unit.create({ data: { id: `unit-${key}`, name: `Kilogram ${key}`, abbreviation: `kg-${key}`, normalizedName: `kilogram ${key}`, normalizedAbbreviation: `kg-${key}` } });
  const alternate = await prisma.unit.create({ data: { id: `sack-${key}`, name: `Sack ${key}`, abbreviation: `sack-${key}`, normalizedName: `sack ${key}`, normalizedAbbreviation: `sack-${key}` } });
  const item = await prisma.item.create({ data: { id: `rice-${key}`, name: `Rice ${key}`, normalizedName: `rice ${key}`, categoryId: category.id, baseUnitId: base.id, reorderLevel: "10" } });
  const conversion = await prisma.itemUnitConversion.create({ data: { id: `conversion-${key}`, itemId: item.id, alternateUnitId: alternate.id, baseUnitQuantity: "25" } });
  const vendor = await prisma.vendor.create({ data: { id: `vendor-${key}`, name: `Vendor ${key}`, normalizedName: `vendor ${key}` } });
  const po = await prisma.purchaseOrder.create({ data: { id: `po-${key}`, purchaseOrderNo: `PO-${key}`, normalizedPurchaseOrderNo: `po-${key}`, vendorId: vendor.id } });
  const line = { id: crypto.randomUUID(), itemId: item.id, quantity: "", selectedUnitId: alternate.id, conversionId: conversion.id, openingUnitCost: "", zeroCostReason: "" };
  const receipt = { purchaseOrderId: po.id, receiptNo: `DR-${key}`, receiptDate: openingStockToday(), lines: [{ itemId: item.id, selectedUnitId: base.id, quantity: "10", unitPrice: "50" }] };
  return { admin, staff, item, conversion, line, receipt };
}
beforeEach(async () => {
  await prisma.openingStockLine.deleteMany(); await prisma.openingStockDiscard.deleteMany(); await prisma.openingStockSetup.deleteMany(); await prisma.inventoryLedgerMovement.deleteMany();
});

describe("Opening Stock drafts through the public workflow", () => {
  it("returns only canonical serialized lines and refreshes the saved unit baseline", async () => {
    const { admin, line, item, conversion } = await fixture();
    const attemptId = crypto.randomUUID();
    const begun = value(await beginOpeningStock(admin, { attemptId, revision: 0 }));
    const input = { attemptId, revision: begun.revision, countDate: "", note: "", lines: [{ ...line, quantity: "2", openingUnitCost: "10" }] };
    const first = value(await saveOpeningStockDraft(admin, input));
    await prisma.itemUnitConversion.update({ where: { id: conversion.id }, data: { baseUnitQuantity: "30" } });
    const currentUnit = await prisma.unit.update({ where: { id: line.selectedUnitId }, data: { name: "Changed Sack", abbreviation: "changed" } });
    const selected = { conversionId: conversion.id, selectedUnitId: currentUnit.id, selectedUnitName: currentUnit.name, selectedUnitAbbreviation: currentUnit.abbreviation, conversionFactor: "30" };
    const saved = value(await saveOpeningStockDraft(admin, { ...input, revision: first.revision, lines: [{ ...input.lines[0], quantity: "3", openingUnitCost: "11" }] }));
    expect(saved.lines[0]).toMatchObject({ quantity: "3", openingUnitCost: "11", conversionFactor: "25", calculatedBaseUnitQuantity: "75", lineAmount: "33", selectedUnitName: first.lines[0].selectedUnitName });
    expect(saved.lines[0]).not.toHaveProperty("openingStockId");
    expect(JSON.parse(JSON.stringify(saved.lines))).toEqual(saved.lines);
    expect(openingStockUnitSelection(saved.lines[0], selected)).toMatchObject({ conversionFactor: "25", selectedUnitName: first.lines[0].selectedUnitName });
    const base = value(await saveOpeningStockDraft(admin, { ...input, revision: saved.revision, lines: [{ ...input.lines[0], selectedUnitId: item.baseUnitId, conversionId: null }] }));
    expect(openingStockUnitSelection(base.lines[0], selected)).toEqual(selected);
    const changed = value(await saveOpeningStockDraft(admin, { ...input, revision: base.revision }));
    expect(changed.lines[0]).toMatchObject({ conversionFactor: "30", calculatedBaseUnitQuantity: "60", lineAmount: "20", selectedUnitName: "Changed Sack", selectedUnitAbbreviation: "changed" });
  });

  it("saves incomplete fields and exact converted quantities, distinguishing blank costs from zero", async () => {
    const { admin, line } = await fixture();
    const attempt = { attemptId: crypto.randomUUID(), revision: 0 };
    const started = value(await beginOpeningStock(admin, attempt));
    expect(value(await beginOpeningStock(admin, attempt)).revision).toBe(started.revision);
    const saved = value(await saveOpeningStockDraft(admin, { ...attempt, revision: started.revision, countDate: "", note: "Physical count", lines: [line] }));
    let workspace = value(await getOpeningStockWorkspace(admin));
    expect(workspace.lines[0]).toMatchObject({ quantity: "", openingUnitCost: "", calculatedBaseUnitQuantity: null, lineAmount: null });
    const exact = { ...line, quantity: "0.123456789123456789", openingUnitCost: "0", zeroCostReason: "Assigned zero value" };
    value(await saveOpeningStockDraft(admin, { ...attempt, revision: saved.revision, countDate: openingStockToday(), note: "Physical count", lines: [exact] }));
    workspace = value(await getOpeningStockWorkspace(admin));
    expect(workspace.lines[0]).toMatchObject({ id: line.id, position: 0, quantity: exact.quantity, calculatedBaseUnitQuantity: "3.086419728086419725", openingUnitCost: "0", lineAmount: "0", zeroCostReason: "Assigned zero value" });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });

  it("preserves saved conversion evidence on unchanged save and rejects unavailable references", async () => {
    const { admin, line, conversion } = await fixture();
    const attemptId = crypto.randomUUID(); const begun = value(await beginOpeningStock(admin, { attemptId, revision: 0 }));
    const input = { attemptId, revision: begun.revision, countDate: openingStockToday(), note: "", lines: [{ ...line, quantity: "3", openingUnitCost: "1250" }] };
    let saved = value(await saveOpeningStockDraft(admin, input));
    await prisma.itemUnitConversion.update({ where: { id: conversion.id }, data: { baseUnitQuantity: "50" } });
    saved = value(await saveOpeningStockDraft(admin, { ...input, revision: saved.revision }));
    expect(value(await getOpeningStockWorkspace(admin)).lines[0]).toMatchObject({ conversionFactor: "25", calculatedBaseUnitQuantity: "75", lineAmount: "3750" });
    await prisma.unit.update({ where: { id: line.selectedUnitId }, data: { active: false } });
    expect(await saveOpeningStockDraft(admin, { ...input, revision: saved.revision })).toMatchObject({ ok: false, kind: "reference" });
  });

  it("rejects invalid dates, decimal formats and duplicate line identities without changing a saved draft", async () => {
    const { admin, line } = await fixture(); const attemptId = crypto.randomUUID(); const begun = value(await beginOpeningStock(admin, { attemptId, revision: 0 }));
    const input = { attemptId, revision: begun.revision, countDate: "9999-12-31", note: "", lines: [line] };
    expect(await saveOpeningStockDraft(admin, input)).toMatchObject({ ok: false, kind: "validation", fields: { countDate: expect.any(String) } });
    for (const quantity of ["0", "-1", "1e3", "1,000", "oops"]) expect(await saveOpeningStockDraft(admin, { ...input, countDate: "", lines: [{ ...line, quantity }] })).toMatchObject({ ok: false, kind: "validation" });
    expect(await saveOpeningStockDraft(admin, { ...input, countDate: "", lines: [{ ...line, openingUnitCost: "-1" }] })).toMatchObject({ ok: false, kind: "validation" });
    expect(await saveOpeningStockDraft(admin, { ...input, countDate: "", lines: [line, { ...line }] })).toMatchObject({ ok: false, kind: "validation" });
    expect(value(await getOpeningStockWorkspace(admin)).revision).toBe(begun.revision);
  });

  it("enforces persisted administrator permissions and active staff read access", async () => {
    const { admin, staff } = await fixture();
    expect(await beginOpeningStock(staff, { attemptId: "staff-attempt", revision: 0 })).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await getOpeningStockWorkspace(null)).toMatchObject({ ok: false, kind: "forbidden" });
    expect(value(await getOpeningStockWorkspace(staff)).canManage).toBe(false);
    await prisma.user.update({ where: { id: admin.id }, data: { disabled: true } });
    expect(await beginOpeningStock(admin, { attemptId: "disabled-attempt", revision: 0 })).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await prisma.openingStockSetup.count()).toBe(0);
  });

  it("makes discard retries safe across restarts and rejects stale save requests", async () => {
    const { admin, item } = await fixture(); const attemptId = crypto.randomUUID(); const begun = value(await beginOpeningStock(admin, { attemptId, revision: 0 }));
    const discarded = value(await discardOpeningStockDraft(admin, { attemptId, revision: begun.revision }));
    const nextAttempt = crypto.randomUUID(); const restarted = value(await beginOpeningStock(admin, { attemptId: nextAttempt, revision: discarded.revision }));
    expect(value(await discardOpeningStockDraft(admin, { attemptId, revision: begun.revision }))).toEqual(discarded);
    expect(value(await getOpeningStockWorkspace(admin))).toMatchObject({ status: "draft", attemptId: nextAttempt, revision: restarted.revision });
    expect(await saveOpeningStockDraft(admin, { attemptId, revision: begun.revision, countDate: "", note: "", lines: [] })).toMatchObject({ ok: false, kind: "conflict" });
    expect(await beginOpeningStock(admin, { attemptId, revision: discarded.revision })).toMatchObject({ ok: false, kind: "conflict" });
    expect(await prisma.item.findUnique({ where: { id: item.id } })).not.toBeNull();
    expect(await prisma.openingStockDiscard.count()).toBe(1);
  });

  it("blocks real receiving and issuance during setup, then releases receiving on discard", async () => {
    const { admin, staff, receipt } = await fixture(); const attemptId = crypto.randomUUID(); const begun = value(await beginOpeningStock(admin, { attemptId, revision: 0 }));
    expect(await postDeliveryReceipt(staff, receipt)).toMatchObject({ ok: false, kind: "validation", error: expect.stringContaining("Opening Stock setup") });
    expect(await postIssuance(staff, { activityDesignId: "design", activityId: "activity", mealScheduleId: "meal" }, { revision: 1 })).toMatchObject({ ok: false, kind: "reference", error: expect.stringContaining("Opening Stock setup") });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
    const discarded = value(await discardOpeningStockDraft(admin, { attemptId, revision: begun.revision }));
    expect(await postDeliveryReceipt(staff, receipt)).toMatchObject({ ok: true });
    expect(await beginOpeningStock(admin, { attemptId: crypto.randomUUID(), revision: discarded.revision })).toMatchObject({ ok: false, kind: "history" });
    expect(value(await getOpeningStockWorkspace(admin))).toMatchObject({ status: "not-started", eligible: false });
  });

  it("treats posted setup as immutable and calculates Manila dates independently of UTC", async () => {
    const { admin } = await fixture(); const attemptId = crypto.randomUUID(); const begun = value(await beginOpeningStock(admin, { attemptId, revision: 0 }));
    await prisma.openingStockSetup.update({ where: { id: "opening-stock" }, data: { status: "posted" } });
    expect(await discardOpeningStockDraft(admin, { attemptId, revision: begun.revision })).toMatchObject({ ok: false, kind: "conflict" });
    expect(await saveOpeningStockDraft(admin, { attemptId, revision: begun.revision, countDate: "", note: "", lines: [] })).toMatchObject({ ok: false, kind: "conflict" });
    expect(openingStockToday(new Date("2026-11-20T16:01:00Z"))).toBe("2026-11-21");
  });
});
