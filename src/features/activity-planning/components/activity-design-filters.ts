import type { ActivityDesignListItem } from "../types";

export const ALL_FILTER_VALUE = "all";

export type ActivityDesignFilters = {
  search: string;
  fiscalYear: string;
  office: string;
};

export type ActivityDesignFilterOptions = {
  fiscalYears: number[];
  offices: string[];
};

function normalizeOffice(office: string) {
  return office.trim();
}

export function getActivityDesignFilterOptions(
  activityDesigns: ActivityDesignListItem[],
): ActivityDesignFilterOptions {
  return {
    fiscalYears: Array.from(
      new Set(activityDesigns.map((activityDesign) => activityDesign.fiscalYear)),
    ).sort((left, right) => left - right),
    offices: Array.from(
      new Set(
        activityDesigns.map((activityDesign) =>
          normalizeOffice(activityDesign.officeName),
        ),
      ),
    ).sort((left, right) => left.localeCompare(right)),
  };
}

export function filterActivityDesigns(
  activityDesigns: ActivityDesignListItem[],
  filters: ActivityDesignFilters,
) {
  const search = filters.search.trim().toLowerCase();
  const fiscalYear = filters.fiscalYear.trim();
  const office = normalizeOffice(filters.office);

  return activityDesigns.filter((activityDesign) => {
    const matchesSearch =
      search === "" ||
      activityDesign.activityDesignNo.toLowerCase().includes(search) ||
      activityDesign.title.toLowerCase().includes(search);
    const matchesFiscalYear =
      fiscalYear === "" || String(activityDesign.fiscalYear) === fiscalYear;
    const matchesOffice =
      office === "" || normalizeOffice(activityDesign.officeName) === office;

    return matchesSearch && matchesFiscalYear && matchesOffice;
  });
}

export function hasActivityDesignFilters(filters: ActivityDesignFilters) {
  return (
    filters.search.trim() !== "" ||
    filters.fiscalYear.trim() !== "" ||
    normalizeOffice(filters.office) !== ""
  );
}
