import { expect, it } from "vitest";
import { prisma } from "@/prisma/client";
import {
  beginOpeningStock, beginOpeningStockCorrection, createItemWithConversions,
  discardOpeningStockDraft, exportInventory, getKitchenDashboard,
  getOpeningStockWorkspace, listInventory, postDeliveryReceipt,
  postOpeningStock, postOpeningStockCorrection, saveOpeningStockCorrection,
  saveOpeningStockDraft,
} from "@/features/supply-operations/server";
import { getIssuanceWorkspace, postIssuance, saveIssuanceDraft } from "@/features/issuance/server";
import { openingStockToday } from "@/features/supply-operations/domain/opening-stock";
import type { OpeningStockResult } from "@/features/supply-operations/server";

function value<T>(result: OpeningStockResult<T>): T {
  if (!result.ok) throw Error(result.error);
  return result.value;
}

it("carries a clean count through catalog creation, mixed issuance and every correction without rewriting history", async () => {
  const key = crypto.randomUUID();
  const admin = { id: `journey-admin-${key}`, name: "Count administrator", username: `journey-admin-${key}` };
  const staff = { id: `journey-staff-${key}`, name: "Kitchen staff", username: `journey-staff-${key}` };
  await prisma.user.createMany({ data: [admin, staff].map(actor => ({ ...actor, email: `${actor.id}@test.local`, role: actor === admin ? "admin" : "staff" })) });
  const today = openingStockToday();
  const workspace = () => getOpeningStockWorkspace(admin).then(value);
  expect((await workspace()).status).toBe("not-started");
  const abandonedAttemptId = crypto.randomUUID();
  const abandoned = value(await beginOpeningStock(admin, { attemptId: abandonedAttemptId, revision: 0 }));
  value(await discardOpeningStockDraft(admin, { attemptId: abandonedAttemptId, revision: abandoned.revision }));
  const attemptId = crypto.randomUUID();
  const begun = value(await beginOpeningStock(admin, { attemptId, revision: (await workspace()).revision }));
  const created = await createItemWithConversions(admin, {
    item: { name: `Journey Rice ${key}`, categoryId: "default-category-staples-dry-goods", baseUnitId: "default-unit-kilogram", reorderLevel: "10", issuanceQuantityPolicy: "allow-decimals", note: "Count sheet reference" },
    conversions: [{ alternateUnitId: "default-unit-bag", baseUnitQuantity: "25" }],
  });
  if (!created.ok) throw Error(created.error);
  const item = created.item;
  const conversion = item.unitConversions![0];
  const line = { id: crypto.randomUUID(), itemId: item.id, selectedUnitId: conversion.alternateUnit.id, conversionId: conversion.id, quantity: "2", openingUnitCost: "1250", zeroCostReason: "" };
  const lines = [line, { ...line, id: crypto.randomUUID(), selectedUnitId: item.baseUnit.id, conversionId: null, quantity: "25", openingUnitCost: "55" }];
  const saved = value(await saveOpeningStockDraft(admin, { attemptId, revision: begun.revision, countDate: today, note: "Signed physical count", lines }));
  expect((await workspace()).lines).toMatchObject([{ calculatedBaseUnitQuantity: "50", openingUnitCost: "1250" }, { calculatedBaseUnitQuantity: "25", openingUnitCost: "55" }]);
  expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  const postInput = { attemptId, revision: saved.revision, zeroCostAcknowledged: false };
  value(await postOpeningStock(admin, postInput));
  expect(await postOpeningStock(admin, postInput)).toMatchObject({ ok: true });
  const original = (await workspace()).lines;
  const vendor = await prisma.vendor.create({ data: { id: crypto.randomUUID(), name: `Journey vendor ${key}`, normalizedName: `journey vendor ${key}` } });
  const po = await prisma.purchaseOrder.create({ data: { id: crypto.randomUUID(), purchaseOrderNo: `PO-${key}`, normalizedPurchaseOrderNo: `po-${key}`, vendorId: vendor.id } });
  expect(await postDeliveryReceipt(staff, { purchaseOrderId: po.id, receiptNo: `DR-${key}`, receiptDate: today, lines: [{ itemId: item.id, selectedUnitId: item.baseUnit.id, quantity: "25", unitPrice: "60" }] })).toMatchObject({ ok: true });
  const design = await prisma.activityDesign.create({ data: { id: crypto.randomUUID(), activityDesignNo: `AD-${key}`, fiscalYear: Number(today.slice(0, 4)), title: "Integrated kitchen count" } });
  const activity = await prisma.activity.create({ data: { id: crypto.randomUUID(), activityDesignId: design.id, name: "Lunch", officeName: "Kitchen", scheduledDate: new Date(`${today}T00:00:00Z`), plannedBudgetCentavos: BigInt(1000000) } });
  const issue = async (quantity: string) => {
    const meal = await prisma.mealSchedule.create({ data: { id: crypto.randomUUID(), activityId: activity.id, label: "Lunch", mealTime: "12:00" } });
    const context = { activityDesignId: design.id, activityId: activity.id, mealScheduleId: meal.id };
    const draft = await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 1, recipes: [], stockItems: [{ itemId: item.id, conversionId: null, enteredQuantity: quantity }] });
    if (!draft.ok) throw Error(draft.error);
    const posted = await postIssuance(staff, context, { revision: draft.value.draft.revision });
    if (!posted.ok) throw Error(posted.error);
    return { context, posted };
  };
  const first = await issue("80");
  expect(first.posted.value.review[0].openingAllocations).toMatchObject([{ quantity: "50", costCentavos: "250000" }, { quantity: "25", costCentavos: "137500" }]);
  expect(first.posted.value.review[0].receiptAllocations).toMatchObject([{ quantity: "5" }]);
  const correct = async (kind: string, correctionLines: unknown[]) => {
    const id = crypto.randomUUID();
    const draft = value(await beginOpeningStockCorrection(admin, { id, kind }));
    const savedCorrection = value(await saveOpeningStockCorrection(admin, { id, revision: draft.revision, reason: "Reconciled physical count support", note: "Recorded separately", lines: correctionLines }));
    value(await postOpeningStockCorrection(admin, { id, revision: savedCorrection.revision, zeroCostAcknowledged: false }));
    return savedCorrection;
  };
  await correct("add-omitted", [{ ...line, id: crypto.randomUUID(), selectedUnitId: item.baseUnit.id, conversionId: null, quantity: "6", openingUnitCost: "70" }]);
  const omitted = (await workspace()).sources!.find(source => source.remainingQuantity === "6")!;
  await correct("reduce-remaining", [{ id: crypto.randomUUID(), sourceId: omitted.id, quantity: "1" }]);
  await correct("correct-remaining-cost", [{ id: crypto.randomUUID(), sourceId: omitted.id, openingUnitCost: "80", zeroCostReason: "" }]);
  const second = await issue("2");
  expect(second.posted.value.review[0].openingAllocations).toMatchObject([{ quantity: "2", costCentavos: "16000" }]);
  expect(second.posted.value.review[0].receiptAllocations ?? []).toEqual([]);
  const inventory = await listInventory(staff);
  if (!inventory.ok) throw Error(inventory.error);
  expect(inventory.rows.find(row => row.id === item.id)).toMatchObject({ balance: { kind: "valid", quantity: "23" }, stockStatus: "good" });
  const csv = await exportInventory(staff, new URLSearchParams({ q: item.name, status: "good" }));
  if (!csv.ok) throw Error(csv.error);
  expect(csv.csv).toContain('"23"');
  expect(csv.csv).toContain(item.name);
  const report = await getKitchenDashboard(staff, { start: today, end: today }, new Date(Date.now() + 1000));
  if (!report.ok) throw Error(report.error);
  expect(report.report.budgets.rows.find(row => row.id === activity.id)).toMatchObject({ cost: "433500" });
  expect(await getIssuanceWorkspace(staff, first.context)).toEqual(first.posted);
  const final = value(await getOpeningStockWorkspace(staff));
  expect(final.lines).toEqual(original);
  expect(final.corrections).toHaveLength(3);
  expect(final.corrections!.every(correction => correction.status === "posted")).toBe(true);
  expect(final.sources!.find(source => source.id === omitted.id)).toMatchObject({ quantity: "6", remainingQuantity: "0", remainingValueCentavos: "0" });
  expect(final.sources!.find(source => source.remainingQuantity === "3")).toMatchObject({ quantity: "5", remainingValueCentavos: "24000" });
  const retirements = await prisma.openingStockWithdrawal.findMany({ where: { sourceId: omitted.id }, orderBy: { sequence: "asc" } });
  expect(retirements.map(withdrawal => [withdrawal.kind, withdrawal.quantity, withdrawal.costCentavos])).toEqual([
    ["correction-retirement", "1", "7000"],
    ["correction-retirement", "5", "35000"],
  ]);
  expect(await beginOpeningStock(admin, { attemptId: crypto.randomUUID(), revision: final.revision })).toMatchObject({ ok: false });
});
