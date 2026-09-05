import type { OfficeListItem } from "../types";

export type OfficeFilters = {
  search: string;
};

export function filterOffices(
  offices: OfficeListItem[],
  filters: OfficeFilters,
) {
  const search = filters.search.trim().toLowerCase();

  return offices.filter((office) => {
    return (
      search === "" ||
      office.name.toLowerCase().includes(search) ||
      (office.abbreviation?.toLowerCase().includes(search) ?? false)
    );
  });
}

export function hasOfficeFilters(filters: OfficeFilters) {
  return filters.search.trim() !== "";
}
