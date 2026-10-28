import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/client";
import { getKitchenDashboard } from "@/features/supply-operations/server";
import { allocatedSupplyCost, budgetComparison, formatBudgetMoney } from "@/features/supply-operations/domain/budget-variance";
import { readDashboardBudgets } from "@/features/supply-operations/server/db/dashboard-budgets";

const actor = { id: "budget-staff", name: "Staff", username: "budgetstaff" };
const now = new Date("2030-11-02T00:00:00Z");
const period = { start: "2030-10-01", end: "2030-10-31" };
const unit = "default-unit-piece";

async function activity(id: string, budget: bigint | null, date = "2030-10-15") {
  await prisma.activity.create({ data: { id, name: id, officeName: "Kitchen", activityDesignId: "budget-design", scheduledDate: new Date(date), plannedBudgetCentavos: budget } });
}
async function meal(id: string, activityId: string, postedAt: string | null, lineId?: string) {
  await prisma.mealSchedule.create({ data: { id, activityId, label: id, mealTime: "12:00", issuanceRecord: { create: {
    id: `${id}-issue`, status: postedAt ? "posted" : "draft", postedAt: postedAt ? new Date(postedAt) : null,
    ...(lineId ? { itemTotals: { create: { id: `${id}-total`, itemId: "budget-item", finalQuantity: "1", calculatedNumerator: "1", calculatedDenominator: "1",
      receiptAllocations: { create: { id: `${id}-allocation`, deliveryReceiptLineId: lineId, quantity: "1", receiptNo: "Budget receipt", purchaseOrderNo: "BUDGET-PO", receiptDate: new Date("2030-09-01") } },
    } } } : {}),
  } } } });
}
async function report(extra = {}) {
  const result = await getKitchenDashboard(actor, { ...period, ...extra }, now);
  if (!result.ok) throw Error(result.error);
  return result.report.budgets;
}

beforeAll(async () => {
  await prisma.user.create({ data: { ...actor, email: "budget@test.local", role: "staff" } });
  await prisma.vendor.create({ data: { id: "budget-vendor", name: "Budget vendor", normalizedName: "budget vendor" } });
  await prisma.purchaseOrder.create({ data: { id: "budget-po", purchaseOrderNo: "BUDGET-PO", normalizedPurchaseOrderNo: "budget-po", vendorId: "budget-vendor" } });
  await prisma.item.create({ data: { id: "budget-item", name: "Budget item", normalizedName: "budget item", baseUnitId: unit, categoryId: "default-category-staples-dry-goods", reorderLevel: "0" } });
  for (const [id, amount] of [["priced", "1"], ["missing", null]] as const) {
    await prisma.deliveryReceipt.create({ data: { id: `budget-${id}`, receiptNo: id, normalizedReceiptNo: id, purchaseOrderId: "budget-po", purchaseOrderNo: "BUDGET-PO", vendorId: "budget-vendor", vendorName: "Vendor", receiptDate: new Date("2030-09-01"), postedAt: new Date("2030-09-01"),
      lines: { create: { id: `budget-line-${id}`, itemId: "budget-item", itemName: "Budget item", selectedUnitId: unit, baseUnitId: unit, selectedUnitName: "Piece", baseUnitName: "Piece", enteredQuantity: "3", conversionFactor: "1", calculatedBaseUnitQuantity: "3", lineAmount: amount } },
    } });
  }
  await prisma.activityDesign.create({ data: { id: "budget-design", activityDesignNo: "BUDGET-AD", title: "Budget design", fiscalYear: 2030 } });
  await activity("prior", BigInt(100), "2030-09-30");
  await meal("prior-meal", "prior", "2030-09-30T02:00:00Z", "budget-line-priced");
  await activity("under", BigInt(100));
  await meal("under-meal", "under", "2030-10-15T02:00:00Z", "budget-line-priced");
  await meal("under-pending", "under", null);
  await activity("over", BigInt(30));
  await meal("over-meal", "over", "2030-10-16T02:00:00Z", "budget-line-priced");
  await activity("incomplete", BigInt(100));
  await meal("incomplete-meal", "incomplete", "2030-10-16T03:00:00Z", "budget-line-missing");
  await activity("unbudgeted", null);
  await activity("zero", BigInt(0));
  await activity("late", BigInt(100));
  await meal("late-meal", "late", "2030-10-31T16:00:00Z", "budget-line-missing");
});

describe("Activity budget comparison", () => {
  it("allocates full receipt cents exactly and handles conversion ratios without floating point", () => {
    expect(["0", "1", "2"].map((before) => allocatedSupplyCost("1", "3", before, "1"))).toEqual(["33", "34", "33"]);
    expect(allocatedSupplyCost("12500", "250000", "0", "1000")).toBe("5000");
    for (const amount of [null, "bad", "-1"]) expect(allocatedSupplyCost(amount, "3", "0", "1")).toBeNull();
    expect(allocatedSupplyCost("1", "3", "3", "1")).toBeNull();
    expect(allocatedSupplyCost("1", "0", "0", "1")).toBeNull();
    expect(allocatedSupplyCost("0.00", "3", "0", "1")).toBe("0");
  });
  it("compares exact centavos and defines zero budgets without dividing by zero", () => {
    expect(budgetComparison("5000000", "4200000")).toEqual({ variance: "800000", used: "84.0%" });
    expect(budgetComparison("3000000", "3300000")).toEqual({ variance: "-300000", used: "110.0%" });
    expect(budgetComparison("0", "1")).toEqual({ variance: "-1", used: null });
    expect(budgetComparison(null, "0")).toEqual({ variance: null, used: null });
    expect(formatBudgetMoney("-300000", true)).toBe("−₱3,000.00");
    expect(formatBudgetMoney("800000", true)).toBe("+₱8,000.00");
  });
  it("uses prior shared receipt history, excludes drafts and late postings, and preserves the full budget", async () => {
    const data = await report();
    const second = await report({ budgetPage: "2" });
    const rows = [...data.rows, ...second.rows];
    expect(rows.find((row) => row.id === "under")).toMatchObject({ budget: "100", cost: "34", variance: "66", used: "34.0%", pendingMeals: 1 });
    expect(rows.find((row) => row.id === "over")).toMatchObject({ cost: "33", variance: "-3", used: "110.0%" });
    expect(rows.find((row) => row.id === "late")).toMatchObject({ cost: "0", variance: "100", pendingMeals: 1 });
    expect(data.total).toBe(6);
    expect(data.summary).toEqual({ budget: "230", cost: "67", variance: "163", comparable: 4, excluded: 2, reconstructed: false });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });
  it("does not turn missing prices, unbudgeted Activities or inconsistent allocations into a variance", async () => {
    const data = await report();
    expect(data.rows.find((row) => row.id === "incomplete")).toMatchObject({ cost: null, variance: null, used: null });
    expect(data.rows.find((row) => row.id === "unbudgeted")).toMatchObject({ budget: null, variance: null });
    await prisma.issuanceReceiptAllocation.update({ where: { id: "over-meal-allocation" }, data: { quantity: "2" } });
    try { expect((await report()).rows.find((row) => row.id === "over")?.cost).toBeNull(); }
    finally { await prisma.issuanceReceiptAllocation.update({ where: { id: "over-meal-allocation" }, data: { quantity: "1" } }); }
    await prisma.deliveryReceiptLine.update({ where: { id: "budget-line-priced" }, data: { baseUnitId: "default-unit-kilogram" } });
    try { expect((await report()).rows.find((row) => row.id === "over")?.variance).toBeNull(); }
    finally { await prisma.deliveryReceiptLine.update({ where: { id: "budget-line-priced" }, data: { baseUnitId: unit } }); }
  });
  it("marks reconstructed costs and clamps budget pagination without changing summary totals", async () => {
    await prisma.issuanceReceiptAllocation.update({ where: { id: "over-meal-allocation" }, data: { basis: "reconstructed" } });
    expect((await report()).rows.find((row) => row.id === "over")?.reconstructed).toBe(true);
    expect((await report()).summary.reconstructed).toBe(true);
    expect(await report({ budgetPage: "999" })).toMatchObject({ page: 2, pageCount: 2, total: 6, summary: { cost: "67" } });
  });
  it("filters Activity names and Offices before pagination and keeps summary totals in the same scope", async () => {
    expect(await report({ activitySearch: " over ", budgetPage: "999" })).toMatchObject({ search: "over", total: 1, page: 1, summary: { budget: "30", cost: "33", variance: "-3" } });
    expect((await report({ activitySearch: "Kitchen" })).total).toBe(6);
    expect(await report({ activitySearch: "absent" })).toMatchObject({ total: 0, summary: { comparable: 0, budget: "0", cost: "0" } });
  });

  it("keeps late-entered reconstructed receipt costs as estimates, while rejecting recorded chronology errors", async () => {
    const original = await prisma.issuanceReceiptAllocation.findUniqueOrThrow({ where: { id: "over-meal-allocation" }, select: { basis: true } });
    await prisma.issuanceReceiptAllocation.update({ where: { id: "over-meal-allocation" }, data: { basis: "reconstructed" } });
    await prisma.deliveryReceipt.update({ where: { id: "budget-priced" }, data: { postedAt: new Date("2030-11-01") } });
    try {
      const data = await report();
      expect(data.rows.find((row) => row.id === "over")).toMatchObject({ cost: "33", variance: "-3", reconstructed: true });
      expect((await report({ activitySearch: "under" })).rows[0].cost).toBeNull();
      expect(data.summary.reconstructed).toBe(true);
      await prisma.deliveryReceipt.update({ where: { id: "budget-priced" }, data: { postedAt: new Date("2030-11-03") } });
      expect((await report()).rows.find((row) => row.id === "over")?.cost).toBeNull();
    } finally {
      await prisma.deliveryReceipt.update({ where: { id: "budget-priced" }, data: { postedAt: new Date("2030-09-01") } });
      await prisma.issuanceReceiptAllocation.update({ where: { id: "over-meal-allocation" }, data: { basis: original.basis } });
    }
  });

  it("batches a larger cohort and shared receipt history while preserving all-period totals", async () => {
    await prisma.deliveryReceipt.create({ data: { id: "bulk-receipt", receiptNo: "bulk", normalizedReceiptNo: "bulk", purchaseOrderId: "budget-po", purchaseOrderNo: "BUDGET-PO", vendorId: "budget-vendor", vendorName: "Vendor", receiptDate: new Date("2030-09-01"), postedAt: new Date("2030-09-01"),
      lines: { create: { id: "bulk-line", itemId: "budget-item", itemName: "Budget item", selectedUnitId: unit, baseUnitId: unit, selectedUnitName: "Piece", baseUnitName: "Piece", enteredQuantity: "2000", conversionFactor: "1", calculatedBaseUnitQuantity: "2000", lineAmount: "20" } },
    } });
    const activities = Array.from({ length: 125 }, (_, index) => ({ id: `bulk-${String(index).padStart(3, "0")}`, name: `bulk-${String(index).padStart(3, "0")}`, officeName: "Bulk Office", activityDesignId: "budget-design", scheduledDate: new Date("2030-10-15"), plannedBudgetCentavos: BigInt(100) }));
    await prisma.activity.createMany({ data: activities });
    const issues = Array.from({ length: 475 }, (_, index) => ({ id: `bulk-issue-${String(index).padStart(3, "0")}`, index }));
    await prisma.mealSchedule.createMany({ data: issues.map(({ id, index }) => ({ id: `${id}-meal`, activityId: index < 300 || index >= 425 ? "prior" : activities[index - 300].id, label: id, mealTime: "12:00" })) });
    await prisma.issuanceRecord.createMany({ data: issues.map(({ id, index }) => ({ id, mealScheduleId: `${id}-meal`, status: "posted", postedAt: new Date(index < 300 ? "2030-09-15" : index < 425 ? "2030-10-15" : "2030-11-03") })) });
    await prisma.issuanceItemTotal.createMany({ data: issues.map(({ id }) => ({ id: `${id}-total`, issuanceRecordId: id, itemId: "budget-item", finalQuantity: "1", calculatedNumerator: "1", calculatedDenominator: "1" })) });
    await prisma.issuanceReceiptAllocation.createMany({ data: issues.map(({ id, index }) => ({ id: `${id}-allocation`, issuanceItemTotalId: `${id}-total`, deliveryReceiptLineId: "bulk-line", quantity: index >= 425 ? "9999" : "1", receiptNo: "bulk", purchaseOrderNo: "BUDGET-PO", receiptDate: new Date("2030-09-01") })) });
    let activityReads = 0;
    let historyReads = 0;
    const data = await prisma.$transaction((tx) => {
      const bounded = new Proxy(tx, { get(target, property, receiver) {
        if (property !== "activity" && property !== "issuanceReceiptAllocation") return Reflect.get(target, property, receiver);
        const delegate = target[property];
        return new Proxy(delegate, { get(model, method, modelReceiver) {
          if (method !== "findMany") return Reflect.get(model, method, modelReceiver);
          return async (args: { take?: number; where?: unknown }) => {
            expect(args.take).toBeGreaterThan(0);
            expect(args.take).toBeLessThanOrEqual(250);
            if (property === "activity") activityReads++;
            else {
              historyReads++;
              expect(args.where).toMatchObject({ issuanceItemTotal: { issuanceRecord: { status: "posted", postedAt: { lte: new Date("2030-10-31T15:59:59.999Z") } } } });
            }
            return Reflect.apply(Reflect.get(model, method, modelReceiver), model, [args]);
          };
        } });
      } });
      return readDashboardBudgets(bounded, period, { activitySearch: "bulk", budgetPage: "25" }, now);
    }, { timeout: 15_000 });
    expect(activityReads).toBeGreaterThan(1);
    expect(historyReads).toBeGreaterThan(1);
    expect(data).toMatchObject({ total: 125, page: 25, rows: expect.any(Array), summary: { budget: "12500", cost: "125", variance: "12375", comparable: 125, excluded: 0 } });
    expect(data.rows.map((row) => row.id)).toEqual(activities.slice(120).map((row) => row.id));
    expect((await report({ activitySearch: "bulk" })).summary).toEqual(data.summary);
    await prisma.deliveryReceiptLine.update({ where: { id: "bulk-line" }, data: { calculatedBaseUnitQuantity: "424" } });
    try {
      // The over-allocation is in a later history chunk, after earlier row costs.
      expect((await report({ activitySearch: "bulk" })).summary).toMatchObject({ comparable: 0, excluded: 125, cost: "0" });
    } finally {
      await prisma.deliveryReceiptLine.update({ where: { id: "bulk-line" }, data: { calculatedBaseUnitQuantity: "2000" } });
    }
  }, 20_000);
});
