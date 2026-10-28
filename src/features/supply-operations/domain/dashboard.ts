import type { DashboardPeriod } from "../dashboard-types";


export type DashboardParams = Record<string, string | string[] | undefined>;
export function manilaDay(now: Date) { return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10); }
export function defaultDashboardPeriod(now: Date): DashboardPeriod {
  const end = manilaDay(now);
  return { start: `${end.slice(0, 7)}-01`, end };
}
export function isDashboardDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1900-01-01" && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function dashboardPeriod(params: DashboardParams, now: Date) {
  const defaults = defaultDashboardPeriod(now);
  const start = params.start === undefined ? defaults.start : params.start;
  const end = params.end === undefined ? defaults.end : params.end;
  if (typeof start !== "string" || typeof end !== "string" || !isDashboardDate(start) || !isDashboardDate(end) || start > end || end > defaults.end) return null;
  return { start, end };
}
/** Receipt dates are date-only UTC values; issuance times are Manila-local instants. */
export function dashboardBounds(period: DashboardPeriod) {
  return {
    receiptStart: new Date(`${period.start}T00:00:00Z`),
    receiptEnd: new Date(Date.parse(`${period.end}T00:00:00Z`) + 86400000),
    issueStart: new Date(`${period.start}T00:00:00+08:00`),
    issueEnd: new Date(Date.parse(`${period.end}T00:00:00+08:00`) + 86400000),
  };
}
