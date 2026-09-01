import type { ActivityDesignListItem } from "../types";

export const ALL_FILTER_VALUE = "all";

export type ActivityDesignFilters = {
  search: string;
  fiscalYear: string;
};

export type ActivityDesignFilterOptions = {
  fiscalYears: number[];
};

export function getActivityDesignFilterOptions(
  activityDesigns: ActivityDesignListItem[],
): ActivityDesignFilterOptions {
  return {
    fiscalYears: Array.from(
      new Set(activityDesigns.map((activityDesign) => activityDesign.fiscalYear)),
    ).sort((left, right) => left - right),
  };
}

export function filterActivityDesigns(
  activityDesigns: ActivityDesignListItem[],
  filters: ActivityDesignFilters,
) {
  const search = filters.search.trim().toLowerCase();
  const fiscalYear = filters.fiscalYear.trim();

  return activityDesigns.filter((activityDesign) => {
    const matchesSearch =
      search === "" ||
      activityDesign.activityDesignNo.toLowerCase().includes(search) ||
      activityDesign.title.toLowerCase().includes(search) ||
      activityDesign.aipReferenceCode?.toLowerCase().includes(search) === true;
    const matchesFiscalYear =
      fiscalYear === "" || String(activityDesign.fiscalYear) === fiscalYear;
    return matchesSearch && matchesFiscalYear;
  });
}

export function hasActivityDesignFilters(filters: ActivityDesignFilters) {
  return filters.search.trim() !== "" || filters.fiscalYear.trim() !== "";
}
