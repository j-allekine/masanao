import { getPlanningReturnUrl, withPlanningReturn } from "./planning-return-state";

export const PLANNING_CHILD_PAGE_SIZE = 10;
type Params = Pick<URLSearchParams, "getAll" | "get">;
export type DesignActivitiesState = { search: string; page: number; created: string | null; notice?: "search-cleared" };

type ChildNamespace = "designActivities" | "mealSchedules";
function getChildState(params: Params, ownerId: string, namespace: ChildNamespace): DesignActivitiesState {
  const keys = ["Owner", "Search", "Page", "Created", "Notice"].map(suffix => `${namespace}${suffix}`);
  const owner = params.get(`${namespace}Owner`);
  if (keys.some(key => params.getAll(key).length > 1) || (owner && owner !== ownerId)) return { search: "", page: 1, created: null };
  const rawPage = params.get(`${namespace}Page`);
  const page = rawPage && /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) ? Number(rawPage) : 1;
  const notice = owner === ownerId && params.get(`${namespace}Notice`) === "search-cleared" ? "search-cleared" as const : undefined;
  return { search: params.get(`${namespace}Search`) ?? "", page, created: params.get(`${namespace}Created`), ...(notice ? { notice } : {}) };
}
function getChildQuery(current: string, ownerId: string, namespace: ChildNamespace, updates: Partial<DesignActivitiesState>) {
  const query = new URLSearchParams(current);
  const state = { ...getChildState(query, ownerId, namespace), ...updates };
  if (updates.search !== undefined || updates.page !== undefined || updates.created !== undefined) state.notice = updates.notice;
  for (const suffix of ["Owner", "Search", "Page", "Created", "Notice"]) query.delete(`${namespace}${suffix}`);
  if (state.search || state.page > 1 || state.created || state.notice) query.set(`${namespace}Owner`, ownerId);
  if (state.search) query.set(`${namespace}Search`, state.search);
  if (state.page > 1) query.set(`${namespace}Page`, String(state.page));
  if (state.created) query.set(`${namespace}Created`, state.created);
  if (state.notice) query.set(`${namespace}Notice`, state.notice);
  return query.toString();
}
export function getDesignActivitiesState(params: Params, designId: string) { return getChildState(params, designId, "designActivities"); }
export function getDesignActivitiesQuery(current: string, designId: string, updates: Partial<DesignActivitiesState>) { return getChildQuery(current, designId, "designActivities", updates); }
export function getMealSchedulesState(params: Params, activityId: string) { return getChildState(params, activityId, "mealSchedules"); }
export function getMealSchedulesQuery(current: string, activityId: string, updates: Partial<DesignActivitiesState>) { return getChildQuery(current, activityId, "mealSchedules", updates); }

/** Targets come from the authoritative record hierarchy, never from query URLs. */
export function getPlanningRecordUrl(path: string, params: Params, designId: string, activityId?: string, mealScheduleId?: string) {
  const designPath = `/activity-designs/${designId}`;
  const activityPath = `${designPath}/activities/${activityId}`;
  const mealPrefix = `${activityPath}/meal-schedules/`;
  const validMealPath = path.startsWith(mealPrefix) && /^[^/?#]+$/.test(path.slice(mealPrefix.length));
  if (path !== designPath && (!activityId || (path !== activityPath && !validMealPath))) return withPlanningReturn(designPath, getPlanningReturnUrl(params.get("planningReturn")));
  const state = getDesignActivitiesState(params, designId);
  let query = getDesignActivitiesQuery("", designId, { ...state, created: null, notice: undefined });
  if (activityId) query = getMealSchedulesQuery(query, activityId, { ...getMealSchedulesState(params, activityId), created: null, notice: undefined });
  const target = withPlanningReturn(`${path}${query ? `?${query}` : ""}`, getPlanningReturnUrl(params.get("planningReturn")));
  if (path === designPath && activityId) return `${target}#open-child-activity-${activityId}`;
  if (path === activityPath && mealScheduleId) return `${target}#open-child-meal-${mealScheduleId}`;
  return target;
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

export function filterMealSchedules<T extends { label: string; mealTime: string }>(records: readonly T[], search: string) {
  const term = search.trim().toLocaleLowerCase();
  return records.filter(record => record.label.toLocaleLowerCase().includes(term) || record.mealTime.includes(term));
}
