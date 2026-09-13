export type ItemListStatus = "all" | "active" | "inactive";

type ItemListStateKeys = {
  search: string;
  category: string;
  status: string;
  page: string;
};

export const itemListStateKeys: ItemListStateKeys = {
  search: "itemsSearch",
  category: "itemsCategory",
  status: "itemsStatus",
  page: "itemsPage",
};

export function parseItemPage(value: string | null) {
  if (!value) return 1;

  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseItemStatus(value: string | null): ItemListStatus {
  return value === "active" || value === "inactive" ? value : "all";
}

export function getItemListState(searchParams: Pick<URLSearchParams, "get">) {
  return {
    search: searchParams.get(itemListStateKeys.search) ?? "",
    categoryId: searchParams.get(itemListStateKeys.category) ?? "",
    status: parseItemStatus(searchParams.get(itemListStateKeys.status)),
    page: parseItemPage(searchParams.get(itemListStateKeys.page)),
  };
}

export function getItemListQuery(
  currentQuery: string,
  updates: {
    search?: string;
    categoryId?: string;
    status?: ItemListStatus;
    page?: number;
  },
) {
  const params = new URLSearchParams(currentQuery);

  if (updates.search !== undefined) {
    if (updates.search === "") {
      params.delete(itemListStateKeys.search);
    } else {
      params.set(itemListStateKeys.search, updates.search);
    }
  }

  if (updates.categoryId !== undefined) {
    if (updates.categoryId === "") {
      params.delete(itemListStateKeys.category);
    } else {
      params.set(itemListStateKeys.category, updates.categoryId);
    }
  }

  if (updates.status !== undefined) {
    if (updates.status === "all") {
      params.delete(itemListStateKeys.status);
    } else {
      params.set(itemListStateKeys.status, updates.status);
    }
  }

  if (updates.page !== undefined) {
    if (updates.page <= 1) {
      params.delete(itemListStateKeys.page);
    } else {
      params.set(itemListStateKeys.page, String(updates.page));
    }
  }

  return params.toString();
}

export function getItemListUrl(
  pathname: string,
  currentQuery: string,
  updates: Parameters<typeof getItemListQuery>[1],
) {
  const query = getItemListQuery(currentQuery, updates);
  return `${pathname}${query ? `?${query}` : ""}`;
}
