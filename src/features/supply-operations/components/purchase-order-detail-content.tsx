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
import WorkspaceHeader from "@/components/workspace/workspace-header";
import { WorkspacePrimaryLink } from "@/components/workspace/catalog-controls";
import { cn } from "@/lib/utils";

import type { PurchaseOrderDetailItem } from "../types";
import DeliveryReceiptHistory from "./delivery-receipt-history";
import PurchaseOrderDeliveredAmount from "./purchase-order-delivered-amount";

export default function PurchaseOrderDetailContent({
  purchaseOrder,
}: {
  purchaseOrder: PurchaseOrderDetailItem;
}) {
  return (
    <div className="flex min-h-svh min-w-0 flex-col bg-card">
      <WorkspaceHeader title="Supply Operations" />

      <div className="mx-auto flex w-full min-w-0 max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-label font-medium uppercase tracking-label text-primary">
              Purchase Order
            </p>
            <h1 className="break-words text-heading-1 font-semibold">
              {purchaseOrder.purchaseOrderNo}
            </h1>
            <p className="text-body text-muted-foreground">
              Review deliveries recorded for this Purchase Order.
            </p>
          </div>
          <Link
            href="/purchase-orders"
            className={cn(buttonVariants({ variant: "outline" }), "self-start sm:self-auto")}
          >
            <ClipboardList data-icon="inline-start" aria-hidden="true" />
            Back to Purchase Orders
          </Link>
        </div>

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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
            <h2 id="delivery-receipt-history-title" className="text-heading-2 font-semibold">
              Delivery Receipt history
            </h2>
            <p className="text-body text-muted-foreground">
              Posted receipts will remain visible here as this order is received.
            </p>
            </div>
            <WorkspacePrimaryLink
              href={`/purchase-orders/${purchaseOrder.id}/record-delivery`}
              icon={<FilePlus2 data-icon="inline-start" aria-hidden="true" />}
            >
              Record delivery
            </WorkspacePrimaryLink>
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
    </div>
  );
}
