import { addExactPositiveDecimals } from "./delivery-receipt";

export type PurchaseOrderDeliverySummary = {
  receiptCount: number;
} & (
  | { amountStatus: "complete"; amount: string }
  | { amountStatus: "no-deliveries" | "not-recorded" | "incomplete"; amount: null }
);

export function summarizePurchaseOrderDeliveries(
  receipts: readonly { lines: readonly { lineAmount: string | null }[] }[],
): PurchaseOrderDeliverySummary {
  if (receipts.length === 0) {
    return { receiptCount: 0, amount: null, amountStatus: "no-deliveries" };
  }

  let recordedLines = 0;
  let missingAmounts = false;
  let amount = "0";
  for (const receipt of receipts) {
    if (receipt.lines.length === 0) missingAmounts = true;
    for (const line of receipt.lines) {
      if (line.lineAmount === null) {
        missingAmounts = true;
      } else {
        amount = addExactPositiveDecimals(amount, line.lineAmount);
        recordedLines++;
      }
    }
  }

  const amountStatus = recordedLines === 0 ? "not-recorded" : missingAmounts ? "incomplete" : "complete";
  return amountStatus === "complete"
    ? { receiptCount: receipts.length, amountStatus, amount }
    : { receiptCount: receipts.length, amountStatus, amount: null };
}
