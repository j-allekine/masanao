import "server-only";
import type { CurrentActor } from "@/server/auth";
import type { DashboardParams } from "../../domain/dashboard";
import { dashboardPeriod, defaultDashboardPeriod } from "../../domain/dashboard";
import type { DashboardResult } from "../../dashboard-types";
import { readDashboardRecords } from "../db/dashboard";

export async function getKitchenDashboard(actor: CurrentActor | null, params: DashboardParams, now = new Date()): Promise<DashboardResult> {
  const period = dashboardPeriod(params, now);
  // Authorization is always checked, including malformed report URLs.
  return readDashboardRecords(actor, period, params, now, defaultDashboardPeriod(now));
}
