import { describe, expect, it } from "vitest";

import {
  getMasterDataListState,
  getMasterDataQuery,
  getMasterDataUrl,
} from "@/features/master-data/components/master-data-list-state";
import {
  getCatalogPageAfterDeletion,
  getCatalogPageItems,
  getCatalogResultsSummary,
  getMobileCatalogPageItems,
} from "@/components/workspace/catalog-pagination";
import { filterUnits } from "@/features/master-data/components/unit-filters";
import { filterCategories } from "@/features/master-data/components/category-filters";
import type { CategoryListItem, UnitListItem } from "@/features/master-data/types";

const units: UnitListItem[] = [
  { id: "gram", name: "Gram", abbreviation: "g", active: true },
  { id: "liter", name: "Liter", abbreviation: "L", active: false },
  { id: "piece", name: "Piece", abbreviation: "pc", active: true },
];

const categories: CategoryListItem[] = [
  {
    id: "dry-goods",
    name: "Dry Goods",
    description: "Shelf-stable ingredients",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "produce",
    name: "Produce",
    description: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("Master Data Units workspace", () => {
  it("matches trimmed, case-insensitive name and abbreviation searches", () => {
    expect(filterUnits(units, { search: "  GRAM  " })).toEqual([units[0]]);
    expect(filterUnits(units, { search: "PC" })).toEqual([units[2]]);
    expect(filterUnits(units, { search: "missing" })).toEqual([]);
  });

  it("matches trimmed, case-insensitive Category name and description searches", () => {
    expect(filterCategories(categories, { search: "  DRY  " })).toEqual([
      categories[0],
    ]);
    expect(filterCategories(categories, { search: "SHELF" })).toEqual([
      categories[0],
    ]);
    expect(filterCategories(categories, { search: "missing" })).toEqual([]);
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
    expect(getMasterDataListState("tab=categories")).toMatchObject({
      tab: "categories",
      search: "",
      page: 1,
    });
    expect(getMasterDataUrl("/master-data", query, { page: 1 })).toBe(
      "/master-data?tab=units&sort=name&search=++gram+",
    );
  });

  it("describes empty, single-result, and paginated result ranges truthfully", () => {
    expect(getCatalogResultsSummary({ start: 0, end: 0, total: 0 })).toBe(
      "No results",
    );
    expect(getCatalogResultsSummary({ start: 1, end: 1, total: 1 })).toBe(
      "Showing 1 result",
    );
    expect(getCatalogResultsSummary({ start: 11, end: 12, total: 12 })).toBe(
      "Showing 11 to 12 of 12 results",
    );
  });

  it("keeps desktop page choices to the current three-page window", () => {
    expect(getCatalogPageItems(2, 3)).toEqual([1, 2, 3]);
    expect(getCatalogPageItems(2, 4)).toEqual([1, 2, 3, "ellipsis-end"]);
    expect(getCatalogPageItems(6, 12)).toEqual([
      "ellipsis-start",
      5,
      6,
      7,
      "ellipsis-end",
    ]);
  });

  it("keeps mobile pagination to three page numbers", () => {
    expect(getMobileCatalogPageItems(1, 7)).toEqual([1, 2, 7]);
    expect(getMobileCatalogPageItems(4, 7)).toEqual([1, 4, 7]);
    expect(getMobileCatalogPageItems(7, 7)).toEqual([1, 6, 7]);
  });

  it("clamps the stored page after deleting the final result on a last page", () => {
    expect(
      getCatalogPageAfterDeletion({ page: 2, total: 11, pageSize: 10 }),
    ).toBe(1);
    expect(
      getCatalogPageAfterDeletion({ page: 2, total: 20, pageSize: 10 }),
    ).toBe(2);
  });
});
