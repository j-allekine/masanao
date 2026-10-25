import { formatDeliveryReceiptAmount } from "../domain/delivery-receipt";
import type { PurchaseOrderDeliverySummary } from "../domain/purchase-order-delivery-summary";

export default function PurchaseOrderDeliveredAmount({
  summary,
}: {
  summary: PurchaseOrderDeliverySummary;
}) {
  if (summary.amountStatus === "complete" || summary.amountStatus === "no-deliveries") {
    return <span className="break-all tabular-nums">₱ {formatDeliveryReceiptAmount(summary.amount ?? "0")}</span>;
  }

  const labels = {
    "not-recorded": "Not recorded",
    incomplete: "Amount incomplete",
  };
  return <span className="text-muted-foreground">{labels[summary.amountStatus]}</span>;
}
