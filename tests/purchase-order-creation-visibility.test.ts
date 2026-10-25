import { describe, expect, it } from "vitest";

import { filterPurchaseOrders } from "@/features/supply-operations/components/purchase-order-filters";
import type { PurchaseOrderListItem } from "@/features/supply-operations/types";

function order(id: string, purchaseOrderNo: string, createdAt: string): PurchaseOrderListItem {
  return {
    id, purchaseOrderNo, createdAt, updatedAt: createdAt,
    vendor: { id: "vendor", name: "Market", isActive: true },
    referenceNumber: null, note: null, hasPostedReceipts: false,
    deliverySummary: { receiptCount: 0, amount: null, amountStatus: "no-deliveries" },
  };
}

describe("Purchase Order creation visibility", () => {
  it("shows new PO 444 before older lower-numbered POs, including after reload", () => {
    const older = order("old", "123", "2026-10-01T00:00:00.000Z");
    const created = order("new", "444", "2026-10-25T00:00:00.000Z");
    expect(filterPurchaseOrders([older, created], { search: "" }).map((po) => po.id))
      .toEqual(["new", "old"]);
  });

  it("does not move an older PO ahead just because it was edited", () => {
    const older = { ...order("old", "123", "2026-10-01T00:00:00.000Z"), updatedAt: "2026-10-26T00:00:00.000Z" };
    const newer = order("new", "444", "2026-10-25T00:00:00.000Z");
    expect(filterPurchaseOrders([older, newer], { search: "" })[0].id).toBe("new");
  });
});
