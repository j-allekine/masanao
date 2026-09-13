import { describe, expect, it } from "vitest";

import {
  filterItems,
  hasItemListFilters,
} from "@/features/supply-operations/components/item-filters";
import { getItemResultsSummary } from "@/features/supply-operations/components/item-pagination";
import {
  getItemListQuery,
  getItemListState,
} from "@/features/supply-operations/components/item-list-state";
import type { ItemListItem } from "@/features/supply-operations/types";

function item(
  id: string,
  name: string,
  categoryId: string,
  isActive = true,
): ItemListItem {
  return {
    id,
    name,
    category: { id: categoryId, name: categoryId, isActive: true },
    baseUnit: {
      id: "unit-1",
      name: "Kilogram",
      abbreviation: "kg",
      active: true,
    },
    note: null,
    isActive,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("Items list state", () => {
  it("parses URL state and preserves unrelated query parameters", () => {
    const state = getItemListState(
      new URLSearchParams(
        "view=compact&itemsSearch=rice&itemsCategory=dry&itemsStatus=inactive&itemsPage=3",
      ),
    );

    expect(state).toEqual({
      search: "rice",
      categoryId: "dry",
      status: "inactive",
      page: 3,
    });
    expect(
      getItemListQuery("view=compact&itemsSearch=rice", {
        categoryId: "dry",
        status: "active",
        page: 2,
      }),
    ).toBe("view=compact&itemsSearch=rice&itemsCategory=dry&itemsStatus=active&itemsPage=2");
  });

  it("clears default list state from the URL", () => {
    expect(
      getItemListQuery(
        "itemsSearch=rice&itemsCategory=dry&itemsStatus=inactive&itemsPage=3",
        { search: "", categoryId: "", status: "all", page: 1 },
      ),
    ).toBe("");
  });
});

describe("Items list filtering", () => {
  const items = [
    item("zulu", "Zulu Rice", "dry"),
    item("alpha", "Alpha Beans", "dry", false),
    item("bravo", "Bravo Oil", "oils"),
  ];

  it("matches names, categories, and lifecycle status in alphabetical order", () => {
    expect(
      filterItems(items, { search: "  rice ", categoryId: "", status: "all" }),
    ).toEqual([items[0]]);
    expect(
      filterItems(items, { search: "", categoryId: "dry", status: "active" }).map(
        (entry) => entry.name,
      ),
    ).toEqual(["Zulu Rice"]);
    expect(
      filterItems(items, { search: "", categoryId: "", status: "inactive" }).map(
        (entry) => entry.name,
      ),
    ).toEqual(["Alpha Beans"]);
  });

  it("reports whether a recoverable filter is active", () => {
    expect(
      hasItemListFilters({ search: "", categoryId: "", status: "all" }),
    ).toBe(false);
    expect(
      hasItemListFilters({ search: "beans", categoryId: "", status: "all" }),
    ).toBe(true);
    expect(
      hasItemListFilters({ search: "", categoryId: "", status: "inactive" }),
    ).toBe(true);
  });
});

describe("Items pagination summary", () => {
  it("formats empty, singular, and paged results accurately", () => {
    expect(getItemResultsSummary({ start: 0, end: 0, total: 0 })).toBe(
      "No results",
    );
    expect(getItemResultsSummary({ start: 1, end: 1, total: 1 })).toBe(
      "Showing 1 result",
    );
    expect(getItemResultsSummary({ start: 11, end: 20, total: 25 })).toBe(
      "Showing 11 to 20 of 25 results",
    );
  });
});
