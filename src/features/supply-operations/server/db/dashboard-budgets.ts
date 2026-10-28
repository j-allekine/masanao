import "server-only";
import type { Prisma } from "@/prisma/generated/client";
import { addRational, compareRational, decimalRational, finiteDecimal, rational } from "@/features/issuance/domain/rational";
import { allocatedSupplyCost, budgetComparison } from "../../domain/budget-variance";
import { dashboardBounds, type DashboardParams } from "../../domain/dashboard";
import type { DashboardBudgetActivity, DashboardPeriod } from "../../dashboard-types";

/** Called only after actor authorization, inside the Dashboard's snapshot transaction. */
export async function readDashboardBudgets(tx: Prisma.TransactionClient, period: DashboardPeriod, params: DashboardParams, now: Date) {
  const bounds = dashboardBounds(period);
  const search = typeof params.activitySearch === "string" ? params.activitySearch.trim().slice(0, 100) : "";
  const cutoff = new Date(Math.min(now.getTime(), bounds.issueEnd.getTime() - 1));
  const activities = await tx.activity.findMany({
    where: { scheduledDate: { gte: bounds.receiptStart, lt: bounds.receiptEnd }, createdAt: { lte: now },
      ...(search ? { OR: [{ name: { contains: search } }, { officeName: { contains: search } }] } : {}),
    },
    select: { id: true, name: true, officeName: true, scheduledDate: true, activityDesignId: true, plannedBudgetCentavos: true,
      mealSchedules: { where: { createdAt: { lte: now } }, orderBy: [{ mealTime: "asc" }, { id: "asc" }], select: { id: true, label: true, mealTime: true,
        issuanceRecord: { select: { status: true, postedAt: true, itemTotals: { select: { itemId: true, item: { select: { baseUnitId: true } }, finalQuantity: true, receiptAllocations: true } } } },
      } },
    }, orderBy: [{ scheduledDate: "desc" }, { name: "asc" }, { id: "asc" }],
  });
  const isPosted = (record: { status: string; postedAt: Date | null } | null) => Boolean(record?.status === "posted" && record.postedAt && record.postedAt <= cutoff);
  const receiptIds = [...new Set(activities.flatMap((activity) => activity.mealSchedules.flatMap((meal) => isPosted(meal.issuanceRecord) ? meal.issuanceRecord!.itemTotals.flatMap((total) => total.receiptAllocations.map((entry) => entry.deliveryReceiptLineId)) : [])))];
  // Shared receipt histories are loaded once, including prior issues by other Activities.
  const receipts = receiptIds.length ? await tx.deliveryReceiptLine.findMany({
    where: { id: { in: receiptIds } }, select: { id: true, itemId: true, baseUnitId: true, lineAmount: true, calculatedBaseUnitQuantity: true,
      deliveryReceipt: { select: { postedAt: true } },
      issuanceAllocations: { select: { id: true, quantity: true, issuanceItemTotal: { select: { issuanceRecord: { select: { status: true, postedAt: true } } } } } },
    },
  }) : [];
  const receiptById = new Map(receipts.map((line) => [line.id, line]));
  const costs = new Map<string, string | null>();
  for (const line of receipts) {
    const history = line.issuanceAllocations.filter((entry) => isPosted(entry.issuanceItemTotal.issuanceRecord))
      .sort((a, b) => a.issuanceItemTotal.issuanceRecord.postedAt!.getTime() - b.issuanceItemTotal.issuanceRecord.postedAt!.getTime() || a.id.localeCompare(b.id));
    let before = "0";
    let valid = true;
    try {
      const total = history.reduce((sum, entry) => addRational(sum, decimalRational(entry.quantity)), rational(BigInt(0)));
      valid = history.every((entry) => decimalRational(entry.quantity).numerator > BigInt(0)) && compareRational(total, decimalRational(line.calculatedBaseUnitQuantity)) <= 0;
    } catch { valid = false; }
    for (const entry of history) {
      const cost = valid && line.deliveryReceipt.postedAt <= entry.issuanceItemTotal.issuanceRecord.postedAt!
        ? allocatedSupplyCost(line.lineAmount, line.calculatedBaseUnitQuantity, before, entry.quantity) : null;
      costs.set(entry.id, cost);
      try { before = finiteDecimal(addRational(decimalRational(before), decimalRational(entry.quantity)))!; }
      catch { valid = false; }
    }
  }
  const rows: DashboardBudgetActivity[] = activities.map((activity) => {
    const meals = activity.mealSchedules.map((meal) => {
      const record = meal.issuanceRecord;
      const posted = isPosted(record);
      let cost: string | null = posted ? "0" : null;
      let reconstructed = false;
      if (posted) {
        if (!record!.itemTotals.length) cost = null;
        for (const total of record!.itemTotals) {
          let valid = total.receiptAllocations.length > 0;
          try {
            const allocated = total.receiptAllocations.reduce((sum, entry) => addRational(sum, decimalRational(entry.quantity)), rational(BigInt(0)));
            valid &&= compareRational(allocated, decimalRational(total.finalQuantity)) === 0;
          } catch { valid = false; }
          for (const entry of total.receiptAllocations) {
            const line = receiptById.get(entry.deliveryReceiptLineId);
            const value = costs.get(entry.id);
            if (!valid || !line || line.itemId !== total.itemId || line.baseUnitId !== total.item.baseUnitId || value == null) cost = null;
            else if (cost !== null) cost = (BigInt(cost) + BigInt(value)).toString();
            reconstructed ||= entry.basis === "reconstructed";
          }
          if (!valid) cost = null;
        }
      }
      return { id: meal.id, label: meal.label, time: meal.mealTime, posted, cost, reconstructed,
        href: `/activity-designs/${activity.activityDesignId}/activities/${activity.id}/meal-schedules/${meal.id}/issuance` };
    });
    const postedMeals = meals.filter((meal) => meal.posted);
    const cost = postedMeals.some((meal) => meal.cost === null) ? null : postedMeals.reduce((sum, meal) => sum + BigInt(meal.cost!), BigInt(0)).toString();
    const budget = activity.plannedBudgetCentavos?.toString() ?? null;
    return { id: activity.id, name: activity.name, office: activity.officeName, date: activity.scheduledDate.toISOString(),
      href: `/activity-designs/${activity.activityDesignId}/activities/${activity.id}`, budget, cost, ...budgetComparison(budget, cost),
      pendingMeals: meals.length - postedMeals.length, reconstructed: meals.some((meal) => meal.reconstructed), mealCount: meals.length };
  });
  const comparable = rows.filter((row) => row.variance !== null);
  const sum = (key: "budget" | "cost") => comparable.reduce((total, row) => total + BigInt(row[key]!), BigInt(0)).toString();
  const budget = sum("budget");
  const cost = sum("cost");
  const pageSize = 5;
  const requested = typeof params.budgetPage === "string" ? Number(params.budgetPage) : 1;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number.isSafeInteger(requested) ? requested : 1));
  return { search, rows: rows.slice((page - 1) * pageSize, page * pageSize), page, pageCount, pageSize, total: rows.length,
    summary: { budget, cost, variance: budgetComparison(budget, cost).variance!, comparable: comparable.length, excluded: rows.length - comparable.length, reconstructed: comparable.some((row) => row.reconstructed) },
  };
}
