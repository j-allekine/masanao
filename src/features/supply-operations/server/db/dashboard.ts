import "server-only";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";
import type { DashboardParams } from "../../domain/dashboard";
import type { DashboardPeriod, DashboardResult } from "../../dashboard-types";
import { readDashboardBudgets } from "./dashboard-budgets";

export async function readDashboardRecords(actor: CurrentActor | null, period: DashboardPeriod | null, params: DashboardParams, now: Date, defaults: DashboardPeriod): Promise<DashboardResult> {
  if (!actor) return { ok: false, kind: "forbidden", error: "Staff access required.", period: defaults };
  return prisma.$transaction(async (tx) => {
    const authorized = await tx.user.findFirst({ where: { id: actor.id, disabled: false, role: { in: ["staff", "admin"] } }, select: { id: true } });
    if (!authorized) return { ok: false, kind: "forbidden", error: "Staff access required.", period: defaults };
    if (!period) return { ok: false, kind: "validation", error: "Choose valid dates, with From no later than To and To no later than today (Manila).", period: defaults };
    const budgets = await readDashboardBudgets(tx, period, params, now);
    return { ok: true, report: { period, generatedAt: now.toISOString(), budgets, sampleData: process.env.MASANAO_DASHBOARD_SAMPLE_DATA === "1" } };
  });
}
