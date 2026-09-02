export type PlanningListSection = "activity-designs" | "activities";

type PlanningListStateKeys = {
  search: string;
  page: string;
};

export const planningListStateKeys: Record<
  PlanningListSection,
  PlanningListStateKeys
> = {
  "activity-designs": {
    search: "activityDesignsSearch",
    page: "activityDesignsPage",
  },
  activities: {
    search: "activitiesSearch",
    page: "activitiesPage",
  },
};

type SearchParamsReader = Pick<URLSearchParams, "get">;

export function parsePlanningPage(value: string | null) {
  if (!value) return 1;

  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function getPlanningListState(
  searchParams: SearchParamsReader,
  section: PlanningListSection,
) {
  const keys = planningListStateKeys[section];

  return {
    search: searchParams.get(keys.search) ?? "",
    page: parsePlanningPage(searchParams.get(keys.page)),
  };
}

export function getPlanningListUrl(
  pathname: string,
  currentQuery: string,
  section: PlanningListSection,
  updates: { search?: string; page?: number },
) {
  const params = new URLSearchParams(currentQuery);
  const keys = planningListStateKeys[section];

  if (updates.search !== undefined) {
    if (updates.search === "") {
      params.delete(keys.search);
    } else {
      params.set(keys.search, updates.search);
    }
  }

  if (updates.page !== undefined) {
    if (updates.page <= 1) {
      params.delete(keys.page);
    } else {
      params.set(keys.page, String(updates.page));
    }
  }

  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}
