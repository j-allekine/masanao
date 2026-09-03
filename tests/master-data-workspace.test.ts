import { describe, expect, it } from "vitest";

import {
  getMasterDataListState,
  getMasterDataQuery,
  getMasterDataUrl,
} from "@/features/master-data/components/master-data-list-state";
import { getUnitResultsSummary } from "@/features/master-data/components/unit-pagination";
import { filterUnits } from "@/features/master-data/components/unit-filters";
import type { UnitListItem } from "@/features/master-data/types";

const units: UnitListItem[] = [
  { id: "gram", name: "Gram", abbreviation: "g", active: true },
  { id: "liter", name: "Liter", abbreviation: "L", active: false },
  { id: "piece", name: "Piece", abbreviation: "pc", active: true },
];

describe("Master Data Units workspace", () => {
  it("matches trimmed, case-insensitive name and abbreviation searches", () => {
    expect(filterUnits(units, { search: "  GRAM  " })).toEqual([units[0]]);
    expect(filterUnits(units, { search: "PC" })).toEqual([units[2]]);
    expect(filterUnits(units, { search: "missing" })).toEqual([]);
  });

  it("keeps the selected tab, search, page, and unrelated query values", () => {
    const query = getMasterDataQuery("tab=units&sort=name", {
      search: "  gram ",
      page: 2,
    });

    expect(query).toBe("tab=units&sort=name&search=++gram+&page=2");
    expect(getMasterDataListState("tab=units&search=gram&page=3")).toEqual({
      tab: "units",
      search: "gram",
      page: 3,
    });
    expect(getMasterDataUrl("/master-data", query, { page: 1 })).toBe(
      "/master-data?tab=units&sort=name&search=++gram+",
    );
  });

  it("describes empty, single-result, and paginated result ranges truthfully", () => {
    expect(getUnitResultsSummary({ start: 0, end: 0, total: 0 })).toBe(
      "No results",
    );
    expect(getUnitResultsSummary({ start: 1, end: 1, total: 1 })).toBe(
      "Showing 1 result",
    );
    expect(getUnitResultsSummary({ start: 11, end: 12, total: 12 })).toBe(
      "Showing 11 to 12 of 12 results",
    );
  });
});
