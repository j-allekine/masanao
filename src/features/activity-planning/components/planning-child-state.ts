import { getPlanningReturnUrl, withPlanningReturn } from "./planning-return-state";

export const PLANNING_CHILD_PAGE_SIZE = 10;
type Params = Pick<URLSearchParams, "getAll" | "get">;
export type DesignActivitiesState = { search: string; page: number; created: string | null };

export function getDesignActivitiesState(params: Params, designId: string): DesignActivitiesState {
  const keys = ["designActivitiesOwner", "designActivitiesSearch", "designActivitiesPage", "designActivitiesCreated"];
  const owner = params.get("designActivitiesOwner");
  if (keys.some(key => params.getAll(key).length > 1) || (owner && owner !== designId)) return { search: "", page: 1, created: null };
  const rawPage = params.get("designActivitiesPage");
  const page = rawPage && /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) ? Number(rawPage) : 1;
  return { search: params.get("designActivitiesSearch") ?? "", page, created: params.get("designActivitiesCreated") };
}

export function getDesignActivitiesQuery(current: string, designId: string, updates: Partial<DesignActivitiesState>) {
  const query = new URLSearchParams(current);
  const state = { ...getDesignActivitiesState(query, designId), ...updates };
  for (const key of ["designActivitiesOwner", "designActivitiesSearch", "designActivitiesPage", "designActivitiesCreated"]) query.delete(key);
  if (state.search || state.page > 1 || state.created) query.set("designActivitiesOwner", designId);
  if (state.search) query.set("designActivitiesSearch", state.search);
  if (state.page > 1) query.set("designActivitiesPage", String(state.page));
  if (state.created) query.set("designActivitiesCreated", state.created);
  return query.toString();
}

/** Targets come from the authoritative record hierarchy, never from query URLs. */
export function getPlanningRecordUrl(path: string, params: Params, designId: string, activityId?: string) {
  const designPath = `/activity-designs/${designId}`;
  const activityPath = `${designPath}/activities/${activityId}`;
  if (path !== designPath && (!activityId || (path !== activityPath && !path.startsWith(`${activityPath}/meal-schedules/`)))) return withPlanningReturn(designPath, getPlanningReturnUrl(params.get("planningReturn")));
  const state = getDesignActivitiesState(params, designId);
  const query = getDesignActivitiesQuery("", designId, { ...state, created: null });
  return withPlanningReturn(`${path}${query ? `?${query}` : ""}`, getPlanningReturnUrl(params.get("planningReturn")));
}

export function filterDesignActivities<T extends { name: string; officeName: string }>(records: readonly T[], search: string) {
  const term = search.trim().toLocaleLowerCase();
  return records.filter(record => record.name.toLocaleLowerCase().includes(term) || record.officeName.toLocaleLowerCase().includes(term));
}

/** Let Next's native-history wrapper supply its routing markers and tree. */
export function writePlanningChildUrl(url: string, push = false) {
  const data = { ...window.history.state };
  delete data.__NA;
  delete data._N;
  if (push) window.history.pushState(data, "", url);
  else window.history.replaceState(data, "", url);
}
