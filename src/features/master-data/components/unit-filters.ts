import { normalizeUnitKey } from "../domain/unit";
import { compareCatalogName } from "./catalog-name-order";
import type { UnitListItem } from "../types";

export type UnitFilters = {
  search: string;
};

export function filterUnits(units: UnitListItem[], filters: UnitFilters) {
  const search = filters.search.trim().toLowerCase();

  return units.filter((unit) => {
    return (
      search === "" ||
      unit.name.toLowerCase().includes(search) ||
      unit.abbreviation.toLowerCase().includes(search)
    );
  }).sort((left, right) => compareCatalogName(left, right, normalizeUnitKey));
}

export function hasUnitFilters(filters: UnitFilters) {
  return filters.search.trim() !== "";
}
