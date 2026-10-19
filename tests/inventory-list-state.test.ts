import { describe, expect, it } from "vitest";
import { filterInventory, getInventoryListQuery, getInventoryListState, paginateInventory } from "../src/features/supply-operations/domain/inventory-list-state";
import type { InventoryListItem } from "../src/features/supply-operations/types";

const rows: InventoryListItem[] = Array.from({ length: 25 }, (_, index) => ({
  id: String(index), name: `Rice ${index}`, category: { id: index < 22 ? "archived" : "other", name: "Pantry" },
  baseUnit: { id: "kg", name: "Kilogram", abbreviation: "kg" }, reorderLevel: "1",
  balance: { kind: "valid", quantity: "1.000000000000000001" },
  stockStatus: index === 24 ? "review-required" : "good",
}));

describe("Inventory list state", () => {
  it("parses only normal statuses and safe positive pages", () => {
    for (const page of ["-1", "0", "no", "1.5", "9007199254740992"]) {
      expect(getInventoryListState(new URLSearchParams({ page, status: "review-required" }))).toEqual({ search: "", categoryId: "", stockStatus: "", page: 1 });
    }
    expect(getInventoryListState(new URLSearchParams("q=Rice&category=archived&status=good&page=2"))).toEqual({ search: "Rice", categoryId: "archived", stockStatus: "good", page: 2 });
  });

  it("combines filters before paging without changing order or exact values", () => {
    const filtered = filterInventory(rows, { search: "  rIcE  ", categoryId: "archived", stockStatus: "good" });
    expect(filtered).toEqual(rows.slice(0, 22));
    expect(paginateInventory(filtered, 2)).toMatchObject({ rows: rows.slice(10, 20), page: 2, pageCount: 3, total: 22, start: 11, end: 20 });
    expect(paginateInventory(filtered, 99)).toMatchObject({ rows: rows.slice(20, 22), page: 3, start: 21, end: 22 });
    expect(filterInventory(rows, { search: "Pantry", categoryId: "", stockStatus: "" })).toEqual([]);
    expect(filterInventory(rows, { search: "", categoryId: "", stockStatus: "good" })).not.toContain(rows[24]);
    expect(filterInventory(rows, { search: "", categoryId: "", stockStatus: "" })).toContain(rows[24]);
  });

  it("retains other URL fields on individual clears and clamps empty results", () => {
    const query = getInventoryListQuery("q=Rice&category=archived&status=good&page=3&other=keep", { categoryId: "", page: 1 });
    expect(new URLSearchParams(query).get("q")).toBe("Rice");
    expect(new URLSearchParams(query).get("status")).toBe("good");
    expect(new URLSearchParams(query).get("other")).toBe("keep");
    expect(new URLSearchParams(query).has("category")).toBe(false);
    expect(new URLSearchParams(query).has("page")).toBe(false);
    expect(paginateInventory([], 8)).toEqual({ rows: [], page: 1, pageCount: 1, total: 0, start: 0, end: 0 });
  });
});
