import { describe, expect, it } from "vitest";

import { summarizePurchaseOrderDeliveries } from "@/features/supply-operations/domain/purchase-order-delivery-summary";

function receipt(...amounts: (string | null)[]) {
  return { lines: amounts.map((lineAmount) => ({ lineAmount })) };
}

describe("Purchase Order delivered summary", () => {
  it("distinguishes no deliveries from receipts without recorded amounts", () => {
    expect(summarizePurchaseOrderDeliveries([])).toEqual({ receiptCount: 0, amount: null, amountStatus: "no-deliveries" });
    expect(summarizePurchaseOrderDeliveries([receipt(null), receipt(null)]))
      .toEqual({ receiptCount: 2, amount: null, amountStatus: "not-recorded" });
  });

  it("sums all receipt lines exactly without rounding or floating-point loss", () => {
    expect(summarizePurchaseOrderDeliveries([receipt("0.1", "0.2"), receipt("9007199254740993.005")]))
      .toEqual({ receiptCount: 2, amount: "9007199254740993.305", amountStatus: "complete" });
  });

  it("withholds the total if any historical line or empty receipt is missing amounts", () => {
    for (const receipts of [[receipt("50", null)], [receipt("50"), receipt(null)], [receipt("50"), receipt()]]) {
      expect(summarizePurchaseOrderDeliveries(receipts)).toMatchObject({ amount: null, amountStatus: "incomplete" });
    }
  });

  it("treats a recorded zero as an amount rather than missing history", () => {
    expect(summarizePurchaseOrderDeliveries([receipt("0")]))
      .toEqual({ receiptCount: 1, amount: "0", amountStatus: "complete" });
  });
});
