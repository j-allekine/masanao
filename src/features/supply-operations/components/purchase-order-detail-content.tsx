import Link from "next/link";
import { ClipboardList, FilePlus2, Inbox } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { RecordDetails, RecordFacts } from "@/components/workspace/record-details";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import WorkspaceLayout, { WorkspaceRecordTitle, WorkspaceTaskHeader } from "@/components/workspace/workspace-layout";

import type { PurchaseOrderDetailItem } from "../types";
import DeliveryReceiptHistory from "./delivery-receipt-history";
import PurchaseOrderDeliveredAmount from "./purchase-order-delivered-amount";

export default function PurchaseOrderDetailContent({
  purchaseOrder,
}: {
  purchaseOrder: PurchaseOrderDetailItem;
}) {
  const task = (
    <WorkspaceTaskHeader actions={
      <>
        <Link
          href="/purchase-orders"
          aria-label="Back to Purchase Orders"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ClipboardList data-icon="inline-start" className="hidden sm:inline" aria-hidden="true" />
          <span className="sm:hidden">Purchase Orders</span>
          <span className="hidden sm:inline">Back to Purchase Orders</span>
        </Link>
        <Link
          id="record-delivery-link"
          href={`/purchase-orders/${purchaseOrder.id}/record-delivery`}
          className={buttonVariants({ size: "sm" })}
        >
          <FilePlus2 data-icon="inline-start" className="hidden sm:inline" aria-hidden="true" />
          Record delivery
        </Link>
      </>
    }>
      <WorkspaceRecordTitle title={purchaseOrder.purchaseOrderNo} />
    </WorkspaceTaskHeader>
  );

  return (
    <WorkspaceLayout workspaceTitle="Supply Operations" task={task}>
      <div className="mx-auto flex w-full min-w-0 max-w-content flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <p className="text-body text-muted-foreground">
          Review deliveries recorded for this Purchase Order.
        </p>

        <div className="flex min-w-0 flex-col gap-2">
          <RecordFacts fields={[
            { label: "Vendor", value: purchaseOrder.vendor.name },
            { label: "Total delivered", value: <span data-po-total-delivered><PurchaseOrderDeliveredAmount summary={purchaseOrder.deliverySummary} /></span> },
            { label: "Delivery receipts", value: <span className="tabular-nums" data-po-receipt-count>{purchaseOrder.deliverySummary.receiptCount}</span> },
          ]} />
          <RecordDetails label="Purchase Order details" fields={[
            ...(purchaseOrder.referenceNumber ? [{ label: "Reference number", value: purchaseOrder.referenceNumber }] : []),
            ...(purchaseOrder.note ? [{ label: "Note", value: <span className="whitespace-pre-wrap">{purchaseOrder.note}</span> }] : []),
          ]} />
        </div>

        <section aria-labelledby="delivery-receipt-history-title" className="flex min-w-0 flex-col gap-3">
          <div>
            <h2 id="delivery-receipt-history-title" className="text-heading-2 font-semibold">
              Delivery Receipt history
            </h2>
            <p className="text-body text-muted-foreground">
              Posted receipts will remain visible here as this order is received.
            </p>
          </div>
          {purchaseOrder.deliveryReceipts.length === 0 ? <Empty className="min-h-60 rounded-lg border bg-background" data-delivery-receipt-history="empty">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No Delivery Receipts yet.</EmptyTitle>
              <EmptyDescription>
                Record a Delivery Receipt when supplies arrive for this Purchase Order.
              </EmptyDescription>
            </EmptyHeader>
          </Empty> : <DeliveryReceiptHistory deliveryReceipts={purchaseOrder.deliveryReceipts} />}
        </section>
      </div>
    </WorkspaceLayout>
  );
}
