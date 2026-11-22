import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/client";
import { beginOpeningStock, beginOpeningStockCorrection, discardOpeningStockCorrection, getKitchenDashboard, getOpeningStockWorkspace, listInventory, postDeliveryReceipt, postOpeningStock, postOpeningStockCorrection, saveOpeningStockCorrection, saveOpeningStockDraft } from "@/features/supply-operations/server";
import { getIssuanceWorkspace, postIssuance, saveIssuanceDraft } from "@/features/issuance/server";
import { postOpeningStockCorrectionRecord } from "@/features/supply-operations/server/db/opening-stock-corrections";
import { openingStockToday } from "@/features/supply-operations/domain/opening-stock";
import type { OpeningStockResult, OpeningStockLineInput } from "@/features/supply-operations/opening-stock-types";

function value<T>(result: OpeningStockResult<T>) { if (!result.ok) throw Error(result.error); return result.value; }
type CostLine = { id: string; sourceId: string; openingUnitCost: string; zeroCostReason: string };
const costLine = (sourceId: string, openingUnitCost = "3", zeroCostReason = ""): CostLine => ({ id: crypto.randomUUID(), sourceId, openingUnitCost, zeroCostReason });
async function fixture() {
  const key = crypto.randomUUID();
  const admin = { id: `admin-${key}`, name: "Count administrator", username: `admin-${key}` };
  const staff = { id: `staff-${key}`, name: "Kitchen staff", username: `staff-${key}` };
  await prisma.user.createMany({ data: [admin, staff].map(actor => ({ ...actor, email: `${actor.id}@test.local`, role: actor === admin ? "admin" : "staff" })) });
  const item = await prisma.item.create({ data: { id: `item-${key}`, name: `Rice ${key}`, normalizedName: `rice ${key}`, categoryId: "default-category-staples-dry-goods", baseUnitId: "default-unit-kilogram", reorderLevel: "1" } });
  const line: OpeningStockLineInput = { id: crypto.randomUUID(), itemId: item.id, selectedUnitId: item.baseUnitId, conversionId: null, quantity: "10", openingUnitCost: "2", zeroCostReason: "" };
  const today = openingStockToday(); const yesterday = new Date(`${today}T00:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const countDate = yesterday.toISOString().slice(0, 10);
  const attemptId = crypto.randomUUID(); const begun = value(await beginOpeningStock(admin, { attemptId, revision: 0 }));
  const postCount = async (lines: OpeningStockLineInput[] = [line]) => {
    const saved = value(await saveOpeningStockDraft(admin, { attemptId, revision: begun.revision, countDate, note: "Count sheet", lines }));
    value(await postOpeningStock(admin, { attemptId, revision: saved.revision, zeroCostAcknowledged: true }));
    return value(await getOpeningStockWorkspace(admin));
  };
  const context = { activityDesignId: `design-${key}`, activityId: `activity-${key}` };
  await prisma.activityDesign.create({ data: { id: context.activityDesignId, activityDesignNo: `AD-${key}`, title: "Reduction cost evidence", fiscalYear: Number(today.slice(0, 4)) } });
  await prisma.activity.create({ data: { id: context.activityId, activityDesignId: context.activityDesignId, name: "Meal", officeName: "Kitchen", scheduledDate: new Date(`${today}T00:00:00Z`), plannedBudgetCentavos: BigInt(10000) } });
  const issue = async (quantity: string) => {
    const meal = { ...context, mealScheduleId: crypto.randomUUID() };
    await prisma.mealSchedule.create({ data: { id: meal.mealScheduleId, activityId: context.activityId, label: "Lunch", mealTime: "12:00" } });
    const draft = await saveIssuanceDraft(staff, meal, { revision: 0, mealPax: 1, recipes: [], stockItems: [{ itemId: item.id, conversionId: null, enteredQuantity: quantity }] });
    if (!draft.ok) throw Error(draft.error);
    const result = await postIssuance(staff, meal, { revision: draft.value.draft.revision });
    if (!result.ok) throw Error(result.error);
    return { meal, result };
  };
  const report = async (now = new Date(Date.now() + 1000)) => {
    const result = await getKitchenDashboard(staff, { start: countDate, end: today }, now);
    if (!result.ok) throw Error(result.error);
    return result.report.budgets.rows.find(row => row.id === context.activityId)!;
  };
  const inventory = async () => {
    const result = await listInventory(staff); if (!result.ok) throw Error(result.error);
    return result.rows.find(row => row.id === item.id)!.balance;
  };
  const receipt = async () => {
    const vendor = await prisma.vendor.create({ data: { id: `vendor-${key}`, name: `Vendor ${key}`, normalizedName: `vendor ${key}` } });
    const po = await prisma.purchaseOrder.create({ data: { id: `po-${key}`, purchaseOrderNo: `PO-${key}`, normalizedPurchaseOrderNo: `po-${key}`, vendorId: vendor.id } });
    return postDeliveryReceipt(staff, { purchaseOrderId: po.id, receiptNo: `DR-${key}`, receiptDate: today, lines: [{ itemId: item.id, selectedUnitId: item.baseUnitId, quantity: "25", unitPrice: "60" }] });
  };
  const correct = async (lines: CostLine[], reason = "Verified replacement cost for remaining opening stock") => {
    const id = crypto.randomUUID(); const begun = value(await beginOpeningStockCorrection(admin, { id, kind: "correct-remaining-cost" }));
    const input = { id, revision: begun.revision, reason, note: "Discovery note; effective date is assigned on posting", lines };
    const saved = value(await saveOpeningStockCorrection(admin, input));
    return { id, input, saved, post: { id, revision: saved.revision, zeroCostAcknowledged: false } };
  };
  return { admin, staff, item, line, postCount, issue, report, inventory, receipt, correct };
}

beforeEach(async () => {
  await prisma.inventoryLedgerMovement.deleteMany(); await prisma.openingStockWithdrawal.deleteMany(); await prisma.openingStockCorrectionLine.updateMany({ data: { sourceId: null } }); await prisma.openingStockSource.updateMany({ data: { originalSourceId: null } }); await prisma.openingStockSource.deleteMany(); await prisma.openingStockCorrectionLine.deleteMany(); await prisma.openingStockCorrection.deleteMany(); await prisma.openingStockLine.deleteMany(); await prisma.openingStockDiscard.deleteMany(); await prisma.openingStockSetup.deleteMany();
});

describe("Remaining Opening Stock cost replacements", () => {
  it("replaces the two-unit one-cent residual without changing past issuance or stock quantity", async () => {
    const f = await fixture();
    const unit = await prisma.unit.create({ data: { id: crypto.randomUUID(), name: `Pack ${f.item.id}`, abbreviation: `p-${f.item.id}`, normalizedName: `pack ${f.item.id}`, normalizedAbbreviation: `p-${f.item.id}` } });
    const conversion = await prisma.itemUnitConversion.create({ data: { id: crypto.randomUUID(), itemId: f.item.id, alternateUnitId: unit.id, baseUnitQuantity: "3" } });
    const original = await f.postCount([{ ...f.line, selectedUnitId: unit.id, conversionId: conversion.id, quantity: "1", openingUnitCost: "0.01" }]);
    const source = original.sources![0]; const first = await f.issue("1");
    expect(first.result.value.review[0].openingAllocations).toMatchObject([{ quantity: "1", sequence: 1, costCentavos: "0" }]);
    const historicalCutoff = new Date(); const historicalReport = await f.report(historicalCutoff);
    const c = await f.correct([costLine(source.id, "0.02")]);
    expect(c.saved.correction).toMatchObject({ kind: "correct-remaining-cost", lines: [{ sourceId: source.id, quantity: "2", openingUnitCost: "0.02", lineAmount: "0.04", beforeQuantity: "2", afterQuantity: "2", beforeValueCentavos: "1", afterValueCentavos: "4" }] });
    expect(value(await getOpeningStockWorkspace(f.staff)).corrections).toEqual([]);
    const before = Date.now(); const posted = value(await postOpeningStockCorrection(f.admin, c.post));
    expect(await postOpeningStockCorrection(f.admin, c.post)).toEqual({ ok: true, value: posted });
    const history = value(await getOpeningStockWorkspace(f.staff));
    expect(history.lines).toEqual(original.lines);
    expect(history.corrections).toMatchObject([{ status: "posted", kind: "correct-remaining-cost", reason: c.input.reason, postedByName: f.admin.name }]);
    expect(Date.parse(history.corrections![0].postedAt!)).toBeGreaterThanOrEqual(before);
    const replacement = await prisma.openingStockSource.findFirstOrThrow({ where: { originalSourceId: source.id } });
    expect(replacement).toMatchObject({ position: source.position, quantity: "2", amount: "0.04", revision: 0, correctionLineId: c.input.lines[0].id });
    expect(history.sources!.find(s => s.id === source.id)).toMatchObject({ quantity: "3", remainingQuantity: "0", remainingValueCentavos: "0" });
    expect(history.sources!.find(s => s.id === replacement.id)).toMatchObject({ quantity: "2", remainingQuantity: "2", remainingValueCentavos: "4", correctionId: c.id });
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "2" });
    expect(await f.report()).toMatchObject({ cost: "0" });
    expect(await f.report(historicalCutoff)).toEqual(historicalReport);
    expect(await getIssuanceWorkspace(f.staff, first.meal)).toEqual(first.result);
    const second = await f.issue("1"); const third = await f.issue("1");
    expect(second.result.value.review[0].openingAllocations).toMatchObject([{ sourceId: replacement.id, quantity: "1", sequence: 1, costCentavos: "2", linePosition: source.position }]);
    expect(third.result.value.review[0].openingAllocations).toMatchObject([{ sourceId: replacement.id, quantity: "1", sequence: 2, costCentavos: "2" }]);
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "0" });
    expect(await f.report()).toMatchObject({ cost: "4" });
    expect(await f.report(historicalCutoff)).toEqual(historicalReport);
    expect(await getIssuanceWorkspace(f.staff, first.meal)).toEqual(first.result);
    const oldWithdrawals = await prisma.openingStockWithdrawal.findMany({ where: { sourceId: source.id }, orderBy: { sequence: "asc" } });
    expect(oldWithdrawals.map(w => [w.kind, w.sequence, w.quantity, w.costCentavos])).toEqual([["issuance", 1, "1", "0"], ["correction-retirement", 2, "2", "1"]]);
    expect(await prisma.openingStockSource.findUnique({ where: { id: source.id } })).toMatchObject({ quantity: "3", amount: "0.01" });
    expect(await prisma.inventoryLedgerMovement.findMany({ where: { OR: [{ openingStockCorrectionLineId: c.input.lines[0].id }, { openingStockSourceId: replacement.id }] } })).toEqual(expect.arrayContaining([expect.objectContaining({ movementType: "stock-out", quantity: "2", openingStockCorrectionLineId: c.input.lines[0].id }), expect.objectContaining({ movementType: "stock-in", quantity: "2", openingStockSourceId: replacement.id })]));
    for (const [id, cents] of [[source.id, "1"], [replacement.id, "4"]]) {
      const withdrawals = await prisma.openingStockWithdrawal.findMany({ where: { sourceId: id } });
      expect(withdrawals.reduce((sum, w) => sum + BigInt(w.costCentavos), BigInt(0))).toBe(BigInt(cents));
    }
  });

  it("preserves source priority across repeated descendant replacements and cost increases/decreases", async () => {
    const f = await fixture(); const original = await f.postCount([{ ...f.line, quantity: "3", openingUnitCost: "2" }, { ...f.line, id: crypto.randomUUID(), quantity: "2", openingUnitCost: "9" }]);
    const first = original.sources![0]; const second = original.sources![1];
    const increase = await f.correct([costLine(first.id, "4")]); value(await postOpeningStockCorrection(f.admin, increase.post));
    const descendant = await prisma.openingStockSource.findFirstOrThrow({ where: { originalSourceId: first.id } });
    expect(descendant).toMatchObject({ position: first.position, quantity: "3", amount: "12" });
    const issued = await f.issue("1"); expect(issued.result.value.review[0].openingAllocations).toMatchObject([{ sourceId: descendant.id, costCentavos: "400" }]);
    const decrease = await f.correct([costLine(descendant.id, "1")]);
    expect(decrease.saved.correction.lines).toMatchObject([{ beforeQuantity: "2", afterQuantity: "2", beforeValueCentavos: "800", afterValueCentavos: "200" }]);
    value(await postOpeningStockCorrection(f.admin, decrease.post));
    const last = await prisma.openingStockSource.findFirstOrThrow({ where: { originalSourceId: descendant.id } });
    expect(last).toMatchObject({ position: first.position, quantity: "2", amount: "2", revision: 0 });
    const final = await f.issue("3");
    expect(final.result.value.review[0].openingAllocations).toMatchObject([{ sourceId: last.id, quantity: "2", costCentavos: "200", sequence: 1 }, { sourceId: second.id, quantity: "1", costCentavos: "900" }]);
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "1" });
    expect(await f.report()).toMatchObject({ cost: "1500" });
    expect(await getIssuanceWorkspace(f.staff, issued.meal)).toEqual(issued.result);
    expect(value(await getOpeningStockWorkspace(f.staff)).corrections).toHaveLength(2);
  });

  it("supports explicit zero with per-line reasons and review acknowledgment", async () => {
    const f = await fixture(); const source = (await f.postCount([{ ...f.line, quantity: "0.123456789123456789" }])).sources![0];
    const c = await f.correct([costLine(source.id, "0")]);
    expect(await postOpeningStockCorrection(f.admin, { ...c.post, zeroCostAcknowledged: true })).toMatchObject({ ok: false, kind: "validation", fields: { "lines.0.zeroCostReason": expect.any(String) } });
    const saved = value(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: c.saved.revision, lines: [{ ...c.input.lines[0], zeroCostReason: "Supported deliberate zero" }] }));
    expect(await postOpeningStockCorrection(f.admin, { ...c.post, revision: saved.revision })).toMatchObject({ ok: false, kind: "validation", fields: { zeroCostAcknowledged: expect.any(String) } });
    expect(saved.correction.lines).toMatchObject([{ beforeQuantity: "0.123456789123456789", afterQuantity: "0.123456789123456789", afterValueCentavos: "0" }]);
    value(await postOpeningStockCorrection(f.admin, { ...c.post, revision: saved.revision, zeroCostAcknowledged: true }));
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "0.123456789123456789" });
    const issued = await f.issue("0.123456789123456789");
    expect(issued.result.value.review[0].openingAllocations).toMatchObject([{ costCentavos: "0", sequence: 1 }]);
    expect(await f.report()).toMatchObject({ cost: "0" });
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "0" });
  });

  it("keeps drafts non-reserving and rejects reviewed targets changed by issuance or a correction", async () => {
    const f = await fixture(); const source = (await f.postCount()).sources![0];
    const c = await f.correct([costLine(source.id)]);
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "10" });
    await f.issue("1");
    expect(await postOpeningStockCorrection(f.admin, c.post)).toMatchObject({ ok: false, kind: "conflict" });
    const saved = value(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: c.saved.revision }));
    expect(saved.correction.lines).toMatchObject([{ quantity: "9", beforeQuantity: "9", afterQuantity: "9", afterValueCentavos: "2700" }]);
    const other = await f.correct([costLine(source.id, "4")]); value(await postOpeningStockCorrection(f.admin, other.post));
    expect(await postOpeningStockCorrection(f.admin, { ...c.post, revision: saved.revision })).toMatchObject({ ok: false, kind: "conflict" });
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "9" });
    expect(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: saved.revision })).toMatchObject({ ok: false });
  });

  it("keeps review valid after unrelated same-Item issuance and receipt activity", async () => {
    const f = await fixture(); const original = await f.postCount([{ ...f.line, quantity: "2" }, { ...f.line, id: crypto.randomUUID(), quantity: "5" }]);
    const target = original.sources![1]; const c = await f.correct([costLine(target.id, "0.25")]);
    const issued = await f.issue("1"); expect(issued.result.value.review[0].openingAllocations).toMatchObject([{ sourceId: original.sources![0].id }]);
    expect(await f.receipt()).toMatchObject({ ok: true });
    value(await postOpeningStockCorrection(f.admin, c.post));
    const replacement = await prisma.openingStockSource.findFirstOrThrow({ where: { originalSourceId: target.id } });
    expect(value(await getOpeningStockWorkspace(f.staff)).sources!.find(s => s.id === replacement.id)).toMatchObject({ remainingQuantity: "5", remainingValueCentavos: "125" });
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "31" });
  });

  it("replaces multiple targets atomically, rolls back partial effects and retries without duplicates", async () => {
    const f = await fixture(); const original = await f.postCount([{ ...f.line, quantity: "2" }, { ...f.line, id: crypto.randomUUID(), quantity: "3" }]);
    const c = await f.correct(original.sources!.map(s => costLine(s.id, "0.1")));
    await expect(postOpeningStockCorrectionRecord(f.admin, c.post, { afterFirstMovement: () => { throw Error("Rollback replacement"); } })).rejects.toThrow("Rollback replacement");
    expect(await prisma.openingStockWithdrawal.count()).toBe(0);
    expect(await prisma.openingStockSource.count()).toBe(2);
    expect(await prisma.inventoryLedgerMovement.count()).toBe(2);
    expect(value(await getOpeningStockWorkspace(f.admin)).corrections).toMatchObject([{ status: "draft", revision: c.saved.revision }]);
    const posted = value(await postOpeningStockCorrection(f.admin, c.post));
    expect(await postOpeningStockCorrection(f.admin, c.post)).toEqual({ ok: true, value: posted });
    expect(await prisma.openingStockWithdrawal.count()).toBe(2);
    expect(await prisma.openingStockSource.count()).toBe(4);
    expect(await prisma.inventoryLedgerMovement.count()).toBe(6);
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "5" });
    expect(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: posted.revision })).toMatchObject({ ok: false, kind: "conflict" });
    expect(await discardOpeningStockCorrection(f.admin, { id: c.id, revision: posted.revision })).toMatchObject({ ok: false, kind: "conflict" });
  });

  it("retains blank-cost drafts but rejects unknown/negative costs, quantities, dates, duplicate and exhausted targets", async () => {
    const f = await fixture(); const source = (await f.postCount()).sources![0];
    const c = await f.correct([costLine(source.id, "")], "");
    expect(value(await getOpeningStockWorkspace(f.admin)).corrections).toMatchObject([{ reason: "", lines: [{ sourceId: source.id, openingUnitCost: "", quantity: "10" }] }]);
    expect(await postOpeningStockCorrection(f.admin, c.post)).toMatchObject({ ok: false, kind: "validation" });
    const withReason = value(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: c.saved.revision, reason: "Verified corrected cost" }));
    expect(await postOpeningStockCorrection(f.admin, { ...c.post, revision: withReason.revision })).toMatchObject({ ok: false, kind: "validation", fields: { "lines.0.openingUnitCost": expect.any(String) } });
    for (const extra of [{ openingUnitCost: "-1" }, { quantity: "1" }, { selectedUnitId: f.item.baseUnitId }, { postedAt: "2000-01-01" }]) expect(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: withReason.revision, lines: [{ ...c.input.lines[0], ...extra }] })).toMatchObject({ ok: false, kind: "validation" });
    expect(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: withReason.revision, lines: [costLine(source.id), costLine(source.id)] })).toMatchObject({ ok: false, kind: "validation" });
    expect(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: withReason.revision, lines: [costLine("receipt-or-missing-source")] })).toMatchObject({ ok: false, kind: "reference" });
    expect(await postOpeningStockCorrection(f.admin, { ...c.post, postedAt: "2000-01-01" })).toMatchObject({ ok: false, kind: "validation" });
    await f.issue("10");
    expect(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: withReason.revision, lines: [costLine(source.id)] })).toMatchObject({ ok: false });
  });

  it("rechecks the administrator and hides drafts from staff", async () => {
    const f = await fixture(); const source = (await f.postCount()).sources![0]; const c = await f.correct([costLine(source.id)]);
    expect(value(await getOpeningStockWorkspace(f.staff)).corrections).toEqual([]);
    expect(await beginOpeningStockCorrection(f.staff, { id: crypto.randomUUID(), kind: "correct-remaining-cost" })).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await saveOpeningStockCorrection(f.staff, { ...c.input, revision: c.saved.revision })).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await postOpeningStockCorrection(f.staff, c.post)).toMatchObject({ ok: false, kind: "forbidden" });
    await prisma.user.update({ where: { id: f.admin.id }, data: { role: "staff" } });
    expect(await postOpeningStockCorrection(f.admin, c.post)).toMatchObject({ ok: false, kind: "forbidden" });
    await prisma.user.update({ where: { id: f.admin.id }, data: { role: "admin" } });
    value(await postOpeningStockCorrection(f.admin, c.post));
    expect(value(await getOpeningStockWorkspace(f.staff)).corrections).toMatchObject([{ id: c.id, status: "posted", kind: "correct-remaining-cost" }]);
  });
});
