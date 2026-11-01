import { getPlanningListState, getPlanningListUrl, type PlanningListSection } from "./planning-list-state";

/** Only known local catalogs and their owned query keys can be return targets. */
export function getPlanningReturnUrl(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/activity-designs";
  try {
    const url = new URL(value, "https://planning.invalid");
    if (url.origin !== "https://planning.invalid" || !["/activity-designs", "/activities"].includes(url.pathname)) return "/activity-designs";
    const section = url.pathname.slice(1) as PlanningListSection;
    return getPlanningListUrl(url.pathname, "", section, getPlanningListState(url.searchParams, section));
  } catch { return "/activity-designs"; }
}

export function withPlanningReturn(path: string, catalogUrl: string) {
  const target = getPlanningReturnUrl(catalogUrl);
  const [pathname, current = ""] = path.split("?");
  const query = new URLSearchParams(current);
  query.delete("planningReturn");
  if (target.includes("?") || target === "/activities") query.set("planningReturn", target);
  return `${pathname}${query.size ? `?${query}` : ""}`;
}

/** The record supplies identity; return hints never choose an arbitrary row. */
export function getPlanningCatalogReturnUrl(value: string | null, designId: string, activityId?: string) {
  const target = getPlanningReturnUrl(value);
  if (target.split("?")[0] === "/activities") return activityId ? `${target}#activity-actions-${activityId}` : `${target}#activity-search`;
  return `${target}#activity-design-actions-${designId}`;
}
