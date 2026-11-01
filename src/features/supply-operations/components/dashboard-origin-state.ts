import { dashboardPeriod } from "../domain/dashboard";
import type { DashboardPeriod } from "../dashboard-types";

type Params = Pick<URLSearchParams, "get" | "getAll">;
const originKeys = ["dashboardOrigin", "dashboardOriginOwner"];
const reportKeys = ["start", "end", "activitySearch", "budgetPage"];

/** The caller supplies the applied server report, never unsent form fields. */
export function getAppliedDashboardUrl(period: DashboardPeriod, search: string, page: number) {
  const query = new URLSearchParams({ start: period.start, end: period.end });
  if (search) query.set("activitySearch", search);
  if (page > 1) query.set("budgetPage", String(page));
  return `/dashboard?${query}`;
}

function activityPath(designId: string, activityId: string) {
  return `/activity-designs/${encodeURIComponent(designId)}/activities/${encodeURIComponent(activityId)}`;
}

/** Dashboard origin is separate from the narrower Planning catalog return. */
export function getDashboardOriginUrl(params: Params, designId: string, activityId: string, now = new Date()) {
  if (originKeys.some(key => params.getAll(key).length !== 1)) return null;
  if (params.get("dashboardOriginOwner") !== activityPath(designId, activityId)) return null;
  const value = params.get("dashboardOrigin");
  // Reject normalized aliases, external URLs, fragments and backslash paths.
  if (!value || value.split("?")[0] !== "/dashboard" || /[\\#\r\n\t]/.test(value)) return null;
  try {
    const url = new URL(value, "https://dashboard.invalid");
    if (url.origin !== "https://dashboard.invalid" || url.pathname !== "/dashboard") return null;
    if ([...url.searchParams.keys()].some(key => !reportKeys.includes(key)) || reportKeys.some(key => url.searchParams.getAll(key).length > 1)) return null;
    const period = dashboardPeriod({ start: url.searchParams.get("start") ?? "", end: url.searchParams.get("end") ?? "" }, now);
    if (!period) return null;
    const rawPage = url.searchParams.get("budgetPage");
    if (rawPage !== null && (!/^[1-9]\d*$/.test(rawPage) || !Number.isSafeInteger(Number(rawPage)))) return null;
    const search = url.searchParams.get("activitySearch") ?? "";
    if (search.length > 100 || search !== search.trim()) return null;
    return `${getAppliedDashboardUrl(period, search, rawPage === null ? 1 : Number(rawPage))}#dashboard-activity-${encodeURIComponent(activityId)}`;
  } catch { return null; }
}

/** A Design can retain an origin only for an actual child Activity. */
export function getDesignDashboardOriginUrl(params: Params, designId: string, activityIds: readonly string[], now = new Date()) {
  const owner = params.get("dashboardOriginOwner");
  const activityId = activityIds.find(id => owner === activityPath(designId, id));
  return activityId ? getDashboardOriginUrl(params, designId, activityId, now) : null;
}

/** Invalid hints are removed; unrelated known namespaces remain caller-owned. */
export function appendDashboardOrigin(query: string, params: Params, designId: string, activityId: string, now = new Date()) {
  const origin = getDashboardOriginUrl(params, designId, activityId, now);
  const result = new URLSearchParams(query);
  for (const key of originKeys) result.delete(key);
  if (origin) {
    result.set("dashboardOrigin", origin.split("#")[0]);
    result.set("dashboardOriginOwner", activityPath(designId, activityId));
  }
  return result.toString();
}

export function dashboardActivityHref(path: string, appliedUrl: string, activityId: string, now = new Date()) {
  const match = /^\/activity-designs\/([^/?#\\%]+)\/activities\/([^/?#\\%]+)$/.exec(path);
  if (!match || match[2] !== activityId) return path;
  const params = new URLSearchParams({ dashboardOrigin: appliedUrl, dashboardOriginOwner: path });
  const query = appendDashboardOrigin("", params, match[1], activityId, now);
  return query ? `${path}?${query}` : path;
}
