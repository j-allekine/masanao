import { describe, expect, it } from "vitest";
import { filterReceiptHistory, getPurchaseOrderRecordUrl, getReceiptHistoryQuery, getReceiptHistoryState } from "../src/features/supply-operations/components/receipt-history-state";
import type { DeliveryReceiptHistoryItem } from "../src/features/supply-operations/types";

describe("receipt history URL ownership", () => {
  it("searches the complete ordered history without changing its order", () => {
    const receipts = Array.from({ length: 24 }, (_, index) => ({ id: String(index), receiptNo: `DR-${index}` })) as DeliveryReceiptHistoryItem[];
    expect(filterReceiptHistory(receipts, " dr-2 ").map(({ id }) => id)).toEqual(["2", "20", "21", "22", "23"]);
    expect(filterReceiptHistory(receipts, "missing")).toEqual([]);
  });
  it("keeps history independent from catalog context and discards unsafe targets", () => {
    const params = new URLSearchParams({ receiptSearch: " Raw DR ", receiptPage: "3", purchaseOrdersReturn: "/purchase-orders?purchaseOrdersSearch=Kitchen&purchaseOrdersPage=2", returnTo: "https://example.com" });
    const url = getPurchaseOrderRecordUrl("known-id", params, true);
    expect(url.startsWith("/purchase-orders/known-id/record-delivery?")).toBe(true);
    expect(new URL(url, "https://local.test").searchParams.get("purchaseOrdersReturn")).toBe(params.get("purchaseOrdersReturn"));
    expect(getReceiptHistoryState(params)).toEqual({ search: " Raw DR ", page: 3 });
    expect(getPurchaseOrderRecordUrl("known-id", new URLSearchParams({ purchaseOrdersReturn: "//evil.test" }))).toBe("/purchase-orders/known-id");
  });
  it("resets child state without altering catalog state and retains delayed creation hints", () => {
    const query = "purchaseOrdersReturn=%2Fpurchase-orders&receiptSearch=old&receiptPage=99&receiptCreated=new";
    const next = new URLSearchParams(getReceiptHistoryQuery(query, { search: "", page: 1 }));
    expect(next.get("purchaseOrdersReturn")).toBe("/purchase-orders");
    expect(next.get("receiptCreated")).toBe("new");
    expect(next.has("receiptSearch")).toBe(false);
    expect(next.has("receiptPage")).toBe(false);
    expect(getReceiptHistoryState(new URLSearchParams("receiptPage=-3" )).page).toBe(1);
  });
});
