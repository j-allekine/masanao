import { prisma } from "@/prisma/client";
import { beginOpeningStock, getKitchenDashboard, getOpeningStockWorkspace, listInventory, postDeliveryReceipt, postOpeningStock, saveOpeningStockDraft } from "@/features/supply-operations/server";
import { postIssuance, saveIssuanceDraft } from "@/features/issuance/server";
import { openingStockToday } from "@/features/supply-operations/domain/opening-stock";
import type { OpeningStockResult, OpeningStockLineInput } from "@/features/supply-operations/opening-stock-types";

export function openingStockValue<T>(result: OpeningStockResult<T>) { if (!result.ok) throw Error(result.error); return result.value; }
const value = openingStockValue;

async function openingStockFixtureSeed(options: { adminName: string; itemPrefix: string; reorderLevel: string; quantity: string; openingUnitCost: string }) {
  const key = crypto.randomUUID();
  const admin = { id: `admin-${key}`, name: options.adminName, username: `admin-${key}` };
  const staff = { id: `staff-${key}`, name: "Kitchen staff", username: `staff-${key}` };
  await prisma.user.createMany({ data: [admin, staff].map((actor) => ({ ...actor, email: `${actor.id}@test.local`, role: actor === admin ? "admin" : "staff" })) });
  const item = await prisma.item.create({ data: { id: `${options.itemPrefix}-${key}`, name: `Rice ${key}`, normalizedName: `rice ${key}`, categoryId: "default-category-staples-dry-goods", baseUnitId: "default-unit-kilogram", reorderLevel: options.reorderLevel } });
  const line = { id: crypto.randomUUID(), itemId: item.id, selectedUnitId: item.baseUnitId, conversionId: null, quantity: options.quantity, openingUnitCost: options.openingUnitCost, zeroCostReason: "" };
  const today = openingStockToday();
  const yesterday = new Date(`${today}T00:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const countDate = yesterday.toISOString().slice(0, 10);
  const attemptId = crypto.randomUUID();
  const begun = value(await beginOpeningStock(admin, { attemptId, revision: 0 }));
  return { key, admin, staff, item, line, today, countDate, attemptId, begun };
}

export async function openingStockPostingFixture(options: { activitySearch?: boolean } = {}) {
  const { key, admin, staff, item, line, today, countDate, attemptId, begun } = await openingStockFixtureSeed({ adminName: "Opening administrator", itemPrefix: "rice", reorderLevel: "10", quantity: "75", openingUnitCost: "50" });
  const save = async (patch = {}) => value(await saveOpeningStockDraft(admin, { attemptId, revision: begun.revision, countDate, note: "Physical count sheet", lines: [line], ...patch }));
  const context = { activityDesignId: `design-${key}`, activityId: `activity-${key}`, mealScheduleId: `meal-${key}` };
  await prisma.activityDesign.create({ data: { id: context.activityDesignId, activityDesignNo: `AD-${key}`, title: "Opening stock event", fiscalYear: Number(today.slice(0, 4)) } });
  await prisma.activity.create({ data: { id: context.activityId, activityDesignId: context.activityDesignId, name: `Opening meal ${key}`, officeName: "Kitchen", scheduledDate: new Date(`${today}T00:00:00Z`), plannedBudgetCentavos: BigInt(1000000) } });
  await prisma.mealSchedule.create({ data: { id: context.mealScheduleId, activityId: context.activityId, label: "Lunch", mealTime: "12:00" } });
  const vendor = await prisma.vendor.create({ data: { id: `vendor-${key}`, name: `Vendor ${key}`, normalizedName: `vendor ${key}` } });
  const po = await prisma.purchaseOrder.create({ data: { id: `po-${key}`, purchaseOrderNo: `PO-${key}`, normalizedPurchaseOrderNo: `po-${key}`, vendorId: vendor.id } });
  const receipt = { purchaseOrderId: po.id, receiptNo: `DR-${key}`, receiptDate: today, lines: [{ itemId: item.id, selectedUnitId: item.baseUnitId, quantity: "25", unitPrice: "60" }] };
  const issue = async (quantity: string, meal = context) => {
    const draft = await saveIssuanceDraft(staff, meal, { revision: 0, mealPax: 1, recipes: [], stockItems: [{ itemId: item.id, conversionId: null, enteredQuantity: quantity }] });
    if (!draft.ok) throw Error(draft.error);
    return postIssuance(staff, meal, { revision: draft.value.draft.revision });
  };
  const report = async () => {
    const result = await getKitchenDashboard(staff, { start: countDate, end: today, ...(options.activitySearch === false ? {} : { activitySearch: key }) }, new Date(Date.now() + 1000));
    if (!result.ok) throw Error(result.error);
    return result.report.budgets.rows.find((row) => row.id === context.activityId)!;
  };
  return { admin, staff, item, line, attemptId, begun, save, context, receipt, issue, report, countDate };
}

export async function openingStockRemainingFixture() {
  const { key, admin, staff, item, line, today, countDate, attemptId, begun } = await openingStockFixtureSeed({ adminName: "Count administrator", itemPrefix: "item", reorderLevel: "1", quantity: "10", openingUnitCost: "2" });
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
  return { admin, staff, item, line, postCount, issue, report, inventory, receipt };
}
