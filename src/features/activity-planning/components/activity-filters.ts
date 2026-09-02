import type { ActivityWorkspaceListItem } from "../types";

export type ActivityFilters = {
  search: string;
};

export function filterActivities(
  activities: ActivityWorkspaceListItem[],
  filters: ActivityFilters,
) {
  const search = filters.search.trim().toLowerCase();

  return activities.filter((activity) => {
    return (
      search === "" ||
      activity.name.toLowerCase().includes(search) ||
      activity.activityDesignTitle.toLowerCase().includes(search)
    );
  });
}

export function hasActivityFilters(filters: ActivityFilters) {
  return filters.search.trim() !== "";
}
