import { normalizePurchaseOrderNoKey } from "../domain/purchase-order";
import type { PurchaseOrderListItem } from "../types";

export type PurchaseOrderListFilters = {
  search: string;
};

function searchableText(value: string) {
  return value.trim().toLowerCase();
}

export function filterPurchaseOrders(
  purchaseOrders: PurchaseOrderListItem[],
  filters: PurchaseOrderListFilters,
) {
  const search = searchableText(filters.search);

  return purchaseOrders
    .filter((purchaseOrder) => {
      if (search === "") return true;

      return [
        purchaseOrder.purchaseOrderNo,
        purchaseOrder.vendor.name,
        purchaseOrder.referenceNumber ?? "",
      ].some((value) => searchableText(value).includes(search));
    })
    .sort(
      (left, right) =>
        normalizePurchaseOrderNoKey(left.purchaseOrderNo).localeCompare(
          normalizePurchaseOrderNoKey(right.purchaseOrderNo),
          undefined,
          { sensitivity: "base" },
        ) || left.id.localeCompare(right.id),
    );
}

export function hasPurchaseOrderListFilters(
  filters: PurchaseOrderListFilters,
) {
  return filters.search.trim() !== "";
}
