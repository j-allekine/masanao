import { getPurchaseOrderListQuery, getPurchaseOrderListState } from "./purchase-order-list-state";

const returnKey = "purchaseOrdersReturn";
export const PURCHASE_ORDER_RETURN_ROW_PREFIX = "purchase-order-row-";

/** Accept only this feature's catalog and its owned list keys. */
export function validatePurchaseOrderReturn(value: string | null) {
  if (!value || !value.startsWith("/purchase-orders") || /[\\\r\n]/.test(value)) return "/purchase-orders";
  try {
    const url = new URL(value, "https://masanao.invalid");
    if (url.origin !== "https://masanao.invalid" || url.pathname !== "/purchase-orders" || url.hash) return "/purchase-orders";
    const state = getPurchaseOrderListState(url.searchParams);
    const query = getPurchaseOrderListQuery("", state);
    return `/purchase-orders${query ? `?${query}` : ""}`;
  } catch { return "/purchase-orders"; }
}

export function getPurchaseOrderReturn(params: Pick<URLSearchParams, "get">) {
  return validatePurchaseOrderReturn(params.get(returnKey));
}

export function getPurchaseOrderCatalogReturnHref(params: Pick<URLSearchParams, "get">, id: string) {
  return `${getPurchaseOrderReturn(params)}#${PURCHASE_ORDER_RETURN_ROW_PREFIX}${encodeURIComponent(id)}`;
}

export function withPurchaseOrderReturn(path: string, catalogUrl: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  const safe = validatePurchaseOrderReturn(catalogUrl);
  if (safe !== "/purchase-orders") params.set(returnKey, safe);
  else params.delete(returnKey);
  return `${pathname}${params.size ? `?${params}` : ""}`;
}
