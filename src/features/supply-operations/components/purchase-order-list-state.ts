type PurchaseOrderListStateKeys = {
  search: string;
  page: string;
};

export const purchaseOrderListStateKeys: PurchaseOrderListStateKeys = {
  search: "purchaseOrdersSearch",
  page: "purchaseOrdersPage",
};

export function parsePurchaseOrderPage(value: string | null) {
  if (!value) return 1;

  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function getPurchaseOrderListState(
  searchParams: Pick<URLSearchParams, "get">,
) {
  return {
    search: searchParams.get(purchaseOrderListStateKeys.search) ?? "",
    page: parsePurchaseOrderPage(
      searchParams.get(purchaseOrderListStateKeys.page),
    ),
  };
}

export function getPurchaseOrderListQuery(
  currentQuery: string,
  updates: { search?: string; page?: number },
) {
  const params = new URLSearchParams(currentQuery);

  if (updates.search !== undefined) {
    if (updates.search === "") {
      params.delete(purchaseOrderListStateKeys.search);
    } else {
      params.set(purchaseOrderListStateKeys.search, updates.search);
    }
  }

  if (updates.page !== undefined) {
    if (updates.page <= 1) {
      params.delete(purchaseOrderListStateKeys.page);
    } else {
      params.set(purchaseOrderListStateKeys.page, String(updates.page));
    }
  }

  return params.toString();
}

export function getPurchaseOrderListUrl(
  pathname: string,
  currentQuery: string,
  updates: Parameters<typeof getPurchaseOrderListQuery>[1],
) {
  const query = getPurchaseOrderListQuery(currentQuery, updates);
  return `${pathname}${query ? `?${query}` : ""}`;
}
