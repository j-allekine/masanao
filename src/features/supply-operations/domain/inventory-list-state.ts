import type { InventoryListItem } from "../types";
import type { StockStatus } from "./inventory";

export type InventoryStatusFilterValue = Exclude<StockStatus, "review-required"> | "";
export type InventoryListState = {
  search: string;
  categoryId: string;
  stockStatus: InventoryStatusFilterValue;
  page: number;
};

export const INVENTORY_PAGE_SIZE = 10;

export function getInventoryListState(params: Pick<URLSearchParams, "get">): InventoryListState {
  const page = Number(params.get("page"));
  const status = params.get("status");
  return {
    search: params.get("q") ?? "",
    categoryId: params.get("category") ?? "",
    stockStatus: status === "good" || status === "reorder-now" || status === "out-of-stock" ? status : "",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function getInventoryListQuery(currentQuery: string, updates: Partial<InventoryListState>) {
  const params = new URLSearchParams(currentQuery);
  const keys = { search: "q", categoryId: "category", stockStatus: "status", page: "page" } as const;
  for (const key of Object.keys(keys) as (keyof InventoryListState)[]) {
    const value = updates[key];
    if (value === undefined) continue;
    if (value === "" || (key === "page" && Number(value) <= 1)) params.delete(keys[key]);
    else params.set(keys[key], String(value));
  }
  return params.toString();
}

// Shared with export: apply every filter to the complete server-ordered snapshot.
// Do not re-sort, coerce quantities, or turn exceptional rows into normal stock statuses.
export function filterInventory(items: InventoryListItem[], filters: Pick<InventoryListState, "search" | "categoryId" | "stockStatus">) {
  const search = filters.search.trim().toLowerCase();
  return items.filter((item) =>
    item.name.toLowerCase().includes(search) &&
    (!filters.categoryId || item.category.id === filters.categoryId) &&
    (!filters.stockStatus || item.stockStatus === filters.stockStatus),
  );
}

export function paginateInventory(items: InventoryListItem[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / INVENTORY_PAGE_SIZE));
  const page = Math.max(1, Math.min(requestedPage, pageCount));
  const offset = (page - 1) * INVENTORY_PAGE_SIZE;
  const rows = items.slice(offset, offset + INVENTORY_PAGE_SIZE);
  return { rows, page, pageCount, total: items.length, start: rows.length ? offset + 1 : 0, end: offset + rows.length };
}
