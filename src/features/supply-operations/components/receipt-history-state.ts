import { parsePurchaseOrderPage } from "./purchase-order-list-state";
import { getPurchaseOrderReturn, withPurchaseOrderReturn } from "./purchase-order-return-state";
import type { DeliveryReceiptHistoryItem } from "../types";

export const RECEIPT_PAGE_SIZE = 10;

export function getReceiptHistoryState(params: Pick<URLSearchParams, "get">) {
  return { search: params.get("receiptSearch") ?? "", page: parsePurchaseOrderPage(params.get("receiptPage")) };
}

export function filterReceiptHistory(receipts: readonly DeliveryReceiptHistoryItem[], search: string) {
  const term = search.trim().toLocaleLowerCase();
  return receipts.filter((receipt) => receipt.receiptNo.toLocaleLowerCase().includes(term));
}

/** Receiving owns a known PO route; query hints never choose an arbitrary target. */
export function getPurchaseOrderRecordUrl(id: string, params: Pick<URLSearchParams, "get">, receiving = false) {
  const state = getReceiptHistoryState(params);
  const query = new URLSearchParams();
  if (state.search) query.set("receiptSearch", state.search);
  if (state.page > 1) query.set("receiptPage", String(state.page));
  return withPurchaseOrderReturn(`/purchase-orders/${id}${receiving ? "/record-delivery" : ""}${query.size ? `?${query}` : ""}`, getPurchaseOrderReturn(params));
}

export function getReceiptHistoryQuery(current: string, updates: { search?: string; page?: number; created?: string | null }) {
  const params = new URLSearchParams(current);
  if (updates.search !== undefined) {
    if (updates.search) params.set("receiptSearch", updates.search);
    else params.delete("receiptSearch");
  }
  if (updates.page !== undefined) {
    if (updates.page > 1) params.set("receiptPage", String(updates.page));
    else params.delete("receiptPage");
  }
  if (updates.created !== undefined) {
    if (updates.created) params.set("receiptCreated", updates.created);
    else params.delete("receiptCreated");
  }
  return params.toString();
}
