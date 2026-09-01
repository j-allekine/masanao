import type { ActivityDesignListItem } from "../types";

export type ActivityDesignFilters = {
  search: string;
};

export function filterActivityDesigns(
  activityDesigns: ActivityDesignListItem[],
  filters: ActivityDesignFilters,
) {
  const search = filters.search.trim().toLowerCase();

  return activityDesigns.filter((activityDesign) => {
    return (
      search === "" ||
      activityDesign.activityDesignNo.toLowerCase().includes(search) ||
      activityDesign.title.toLowerCase().includes(search) ||
      activityDesign.aipReferenceCode?.toLowerCase().includes(search) === true
    );
  });
}

export function hasActivityDesignFilters(filters: ActivityDesignFilters) {
  return filters.search.trim() !== "";
}
