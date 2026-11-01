import { describe, expect, it } from "vitest";
import { getPurchaseOrderCatalogReturnHref, getPurchaseOrderReturn, validatePurchaseOrderReturn, withPurchaseOrderReturn } from "@/features/supply-operations/components/purchase-order-return-state";

describe("Purchase Order catalog context", () => {
  it("keeps only catalog search and positive page", () => {
    expect(validatePurchaseOrderReturn("/purchase-orders?purchaseOrdersSearch=Rice&purchaseOrdersPage=2&foreign=yes")).toBe("/purchase-orders?purchaseOrdersSearch=Rice&purchaseOrdersPage=2");
    expect(validatePurchaseOrderReturn("/purchase-orders?purchaseOrdersPage=-1")).toBe("/purchase-orders");
  });
  it("rejects external, encoded, nested and malformed return destinations", () => {
    for (const url of ["//evil.invalid/purchase-orders", "https://evil.invalid/purchase-orders", "/purchase-orders/foreign", "/purchase-orders#receipt", "/purchase-orders%2f..%2frecipes", "/purchase-orders\\evil", "/purchase-orders\n"]) expect(validatePurchaseOrderReturn(url)).toBe("/purchase-orders");
  });
  it("round trips catalog context alongside receipt state", () => {
    const url = withPurchaseOrderReturn("/purchase-orders/one?receiptSearch=DR-1", "/purchase-orders?purchaseOrdersSearch=Rice&purchaseOrdersPage=2");
    const params = new URL(url, "https://masanao.invalid").searchParams;
    expect(params.get("receiptSearch")).toBe("DR-1");
    expect(getPurchaseOrderReturn(params)).toBe("/purchase-orders?purchaseOrdersSearch=Rice&purchaseOrdersPage=2");
    expect(withPurchaseOrderReturn("/purchase-orders/one", "/purchase-orders")).toBe("/purchase-orders/one");
  });
  it("keeps focus fragments separate from the validated return URL", () => {
    expect(getPurchaseOrderCatalogReturnHref(new URLSearchParams({purchaseOrdersReturn:"/purchase-orders?purchaseOrdersSearch=Rice&purchaseOrdersPage=2"}), "actual/id#?"))
      .toBe("/purchase-orders?purchaseOrdersSearch=Rice&purchaseOrdersPage=2#purchase-order-row-actual%2Fid%23%3F");
    expect(getPurchaseOrderCatalogReturnHref(new URLSearchParams({purchaseOrdersReturn:"https://evil.test/purchase-orders#foreign"}), "actual"))
      .toBe("/purchase-orders#purchase-order-row-actual");
  });
});
