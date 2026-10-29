import "server-only";
import type { Prisma } from "@/prisma/generated/client";
import { addRational, compareRational, decimalRational, finiteDecimal } from "@/features/issuance/domain/rational";
import { allocatedSupplyCost, budgetComparison } from "../../domain/budget-variance";
import { dashboardBounds, type DashboardParams } from "../../domain/dashboard";
import type { DashboardBudgetActivity, DashboardPeriod } from "../../dashboard-types";

const ACTIVITY_BATCH_SIZE = 50;
const RECEIPT_BATCH_SIZE = 100;
const HISTORY_BATCH_SIZE = 250;
const PAGE_SIZE = 5;
const receiptSelect = {
  id: true, itemId: true, baseUnitId: true, lineAmount: true,
  calculatedBaseUnitQuantity: true, deliveryReceipt: { select: { postedAt: true } },
} satisfies Prisma.DeliveryReceiptLineSelect;
type Receipt = Prisma.DeliveryReceiptLineGetPayload<{ select: typeof receiptSelect }>;
type ReceiptState = { line: Receipt; before: string; valid: boolean; requestedIds: string[] };

/** Stream shared history; retain costs only for the current Activity batch. */
async function readReceiptCosts(
  tx: Prisma.TransactionClient,
  allocations: { id: string; deliveryReceiptLineId: string }[],
  postedWhere: Prisma.IssuanceRecordWhereInput,
  now: Date,
) {
  const required = new Set(allocations.map((entry) => entry.id));
  const receiptIds = [...new Set(allocations.map((entry) => entry.deliveryReceiptLineId))];
  const receipts = new Map<string, Receipt>();
  const costs = new Map<string, string | null>();
  for (let offset = 0; offset < receiptIds.length; offset += RECEIPT_BATCH_SIZE) {
    const ids = receiptIds.slice(offset, offset + RECEIPT_BATCH_SIZE);
    const lines = await tx.deliveryReceiptLine.findMany({
      where: { id: { in: ids } }, select: receiptSelect, take: RECEIPT_BATCH_SIZE,
    });
    const states = new Map<string, ReceiptState>();
    for (const line of lines) {
      receipts.set(line.id, line);
      states.set(line.id, { line, before: "0", valid: true, requestedIds: [] });
    }
    let cursor: string | undefined;
    while (true) {
      const history = await tx.issuanceReceiptAllocation.findMany({
        where: { deliveryReceiptLineId: { in: ids }, issuanceItemTotal: { issuanceRecord: postedWhere } },
        select: { id: true, quantity: true, basis: true, deliveryReceiptLineId: true,
          issuanceItemTotal: { select: { issuanceRecord: { select: { postedAt: true } } } } },
        orderBy: [{ deliveryReceiptLineId: "asc" }, { issuanceItemTotal: { issuanceRecord: { postedAt: "asc" } } }, { id: "asc" }],
        take: HISTORY_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const entry of history) {
        const state = states.get(entry.deliveryReceiptLineId);
        if (!state) continue;
        const wanted = required.has(entry.id);
        if (wanted) state.requestedIds.push(entry.id);
        let after = state.before;
        try {
          const quantity = decimalRational(entry.quantity);
          const capacity = decimalRational(state.line.calculatedBaseUnitQuantity);
          const cumulative = addRational(decimalRational(state.before), quantity);
          state.valid &&= quantity.numerator > BigInt(0) && capacity.numerator > BigInt(0) && compareRational(cumulative, capacity) <= 0;
          after = finiteDecimal(cumulative)!;
        } catch { state.valid = false; }
        if (wanted) {
          // Reconstructed links may use receipts entered after the original issue.
          // They remain estimates; recorded sources must obey posting chronology.
          const sourceKnown = state.line.deliveryReceipt.postedAt <= now;
          const chronology = entry.basis === "reconstructed" || state.line.deliveryReceipt.postedAt <= entry.issuanceItemTotal.issuanceRecord.postedAt!;
          costs.set(entry.id, state.valid && sourceKnown && chronology
            ? allocatedSupplyCost(state.line.lineAmount, state.line.calculatedBaseUnitQuantity, state.before, entry.quantity)
            : null);
        }
        state.before = after;
      }
      if (history.length < HISTORY_BATCH_SIZE) break;
      cursor = history[history.length - 1].id;
    }
    // A later over-allocation invalidates earlier costs from the same receipt too.
    for (const state of states.values()) {
      if (!state.valid) for (const id of state.requestedIds) costs.set(id, null);
    }
  }
  return { receipts, costs };
}

/** Authorized snapshot read: scan the full cohort in batches, retain one page. */
export async function readDashboardBudgets(tx: Prisma.TransactionClient, period: DashboardPeriod, params: DashboardParams, now: Date) {
  const bounds = dashboardBounds(period);
  const search = typeof params.activitySearch === "string" ? params.activitySearch.trim().slice(0, 100) : "";
  const cutoff = new Date(Math.min(now.getTime(), bounds.issueEnd.getTime() - 1));
  const postedWhere = { status: "posted", postedAt: { lte: cutoff } } satisfies Prisma.IssuanceRecordWhereInput;
  const where = {
    scheduledDate: { gte: bounds.receiptStart, lt: bounds.receiptEnd }, createdAt: { lte: now },
    ...(search ? { OR: [{ name: { contains: search } }, { officeName: { contains: search } }] } : {}),
  } satisfies Prisma.ActivityWhereInput;
  const total = await tx.activity.count({ where });
  const requested = typeof params.budgetPage === "string" ? Number(params.budgetPage) : 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number.isSafeInteger(requested) ? requested : 1));
  const pageStart = (page - 1) * PAGE_SIZE;
  const rows: DashboardBudgetActivity[] = [];
  let budgetTotal = BigInt(0);
  let costTotal = BigInt(0);
  let comparable = 0;
  let reconstructed = false;
  const isPosted = (record: { status: string; postedAt: Date | null } | null) => Boolean(record?.status === "posted" && record.postedAt && record.postedAt <= cutoff);

  for (let offset = 0; offset < total; offset += ACTIVITY_BATCH_SIZE) {
    const activities = await tx.activity.findMany({
      where, take: ACTIVITY_BATCH_SIZE, skip: offset,
      orderBy: [{ scheduledDate: "desc" }, { name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, officeName: true, scheduledDate: true, activityDesignId: true, plannedBudgetCentavos: true,
        mealSchedules: { where: { createdAt: { lte: now } }, select: {
          issuanceRecord: { select: { status: true, postedAt: true,
            itemTotals: { where: { issuanceRecord: postedWhere }, select: {
              itemId: true, item: { select: { baseUnitId: true } }, finalQuantity: true,
              receiptAllocations: { select: { id: true, deliveryReceiptLineId: true, quantity: true, basis: true } },
            } },
          } },
        } },
      },
    });
    const allocations = activities.flatMap((activity) => activity.mealSchedules.flatMap((meal) => meal.issuanceRecord?.itemTotals.flatMap((item) => item.receiptAllocations) ?? []));
    const sources = await readReceiptCosts(tx, allocations, postedWhere, now);
    for (const [index, activity] of activities.entries()) {
      const meals = activity.mealSchedules.map((meal) => {
        const record = meal.issuanceRecord;
        const posted = isPosted(record);
        let cost: string | null = posted ? "0" : null;
        let estimated = false;
        if (posted) {
          if (!record!.itemTotals.length) cost = null;
          for (const item of record!.itemTotals) {
            let valid = item.receiptAllocations.length > 0;
            try {
              let quantity = decimalRational("0");
              for (const entry of item.receiptAllocations) quantity = addRational(quantity, decimalRational(entry.quantity));
              valid &&= compareRational(quantity, decimalRational(item.finalQuantity)) === 0;
            } catch { valid = false; }
            for (const entry of item.receiptAllocations) {
              const line = sources.receipts.get(entry.deliveryReceiptLineId);
              const value = sources.costs.get(entry.id);
              if (!valid || !line || line.itemId !== item.itemId || line.baseUnitId !== item.item.baseUnitId || value == null) cost = null;
              else if (cost !== null) cost = (BigInt(cost) + BigInt(value)).toString();
              estimated ||= entry.basis === "reconstructed";
            }
            if (!valid) cost = null;
          }
        }
        return { posted, cost, estimated };
      });
      const postedMeals = meals.filter((meal) => meal.posted);
      const cost = postedMeals.some((meal) => meal.cost === null) ? null : postedMeals.reduce((sum, meal) => sum + BigInt(meal.cost!), BigInt(0)).toString();
      const budget = activity.plannedBudgetCentavos?.toString() ?? null;
      const row: DashboardBudgetActivity = {
        id: activity.id, name: activity.name, office: activity.officeName, date: activity.scheduledDate.toISOString(),
        href: "/activity-designs/" + activity.activityDesignId + "/activities/" + activity.id, budget, cost, ...budgetComparison(budget, cost),
        pendingMeals: meals.length - postedMeals.length, reconstructed: meals.some((meal) => meal.estimated), mealCount: meals.length,
      };
      if (row.variance !== null) {
        budgetTotal += BigInt(budget!);
        costTotal += BigInt(cost!);
        comparable++;
        reconstructed ||= row.reconstructed;
      }
      if (offset + index >= pageStart && offset + index < pageStart + PAGE_SIZE) rows.push(row);
    }
  }
  const budget = budgetTotal.toString();
  const cost = costTotal.toString();
  return { search, rows, page, pageCount, pageSize: PAGE_SIZE, total,
    summary: { budget, cost, variance: budgetComparison(budget, cost).variance!, comparable, excluded: total - comparable, reconstructed },
  };
}
