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
  return target.includes("?") || target === "/activities" ? `${path}?${new URLSearchParams({ planningReturn: target })}` : path;
}
