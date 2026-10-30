"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilePlus2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RecordDetails, RecordFacts } from "@/components/workspace/record-details";
import WorkspaceHeader from "@/components/workspace/workspace-header";
import { WorkspaceContent } from "@/components/workspace/workspace-content";
import { WorkspaceRecordBreadcrumbs, WorkspaceRecordHeading } from "@/components/workspace/record-presentation";
import { WorkspacePrimaryLink } from "@/components/workspace/catalog-controls";
import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";
import type { PurchaseOrderDetailItem, PurchaseOrderVendorOption } from "../types";
import DeliveryReceiptHistory from "./delivery-receipt-history";
import PurchaseOrderDeliveredAmount from "./purchase-order-delivered-amount";
import PurchaseOrderDialog from "./purchase-order-dialog";
import DeletePurchaseOrderDialog from "./delete-purchase-order-dialog";
import { getPurchaseOrderReturn, withPurchaseOrderReturn } from "./purchase-order-return-state";

export default function PurchaseOrderDetailContent({ purchaseOrder, canManage = false, vendors = [] }: {
  purchaseOrder: PurchaseOrderDetailItem;
  canManage?: boolean;
  vendors?: PurchaseOrderVendorOption[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const catalogUrl = getPurchaseOrderReturn(params);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  function restoreFocus(id: string) { window.setTimeout(() => document.getElementById(id)?.focus(), 0); }
  return <div className="flex min-h-svh min-w-0 flex-col bg-card">
    <WorkspaceHeader title="Supply Operations" />
    <WorkspaceContent>
      <WorkspaceRecordBreadcrumbs ancestors={[{ label: "Purchase Orders", href: catalogUrl }]} currentLabel={purchaseOrder.purchaseOrderNo} />
      <WorkspaceRecordHeading title={purchaseOrder.purchaseOrderNo} actions={canManage ? <>
        <Button id="edit-purchase-order" variant="outline" className="min-h-10 lg:min-h-9" onClick={() => setEditing(true)}><Pencil data-icon="inline-start" />Edit</Button>
        {!purchaseOrder.hasPostedReceipts ? <WorkspaceRowActionMenu actionButtonId="purchase-order-record-actions" ariaLabel={`Actions for ${purchaseOrder.purchaseOrderNo}`} groups={[{ actions: [{ label: "Delete", icon: <Trash2 />, variant: "destructive", onSelect: () => setDeleting(true) }] }]} /> : null}
      </> : undefined} />
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
          <div className="min-w-0"><h2 id="delivery-receipt-history-title" className="text-heading-2 font-semibold">Delivery Receipt history</h2><p className="text-body text-muted-foreground">Posted receipts remain available for inspection.</p></div>
          <WorkspacePrimaryLink href={withPurchaseOrderReturn(`/purchase-orders/${purchaseOrder.id}/record-delivery`, catalogUrl)} icon={<FilePlus2 data-icon="inline-start" aria-hidden="true" />}>Record delivery</WorkspacePrimaryLink>
        </div>
        <DeliveryReceiptHistory deliveryReceipts={purchaseOrder.deliveryReceipts} />
      </section>
      {canManage ? <>
        <PurchaseOrderDialog open={editing} purchaseOrder={purchaseOrder} vendors={vendors} onClose={() => { setEditing(false); restoreFocus("edit-purchase-order"); }} onSuccess={() => { setEditing(false); router.refresh(); restoreFocus("edit-purchase-order"); toast.success("Purchase Order updated"); }} />
        <DeletePurchaseOrderDialog key={deleting ? "open" : "closed"} purchaseOrder={purchaseOrder} open={deleting} onOpenChange={(open) => { setDeleting(open); if (!open) restoreFocus("purchase-order-record-actions"); }} onDeleted={() => { router.push(catalogUrl); toast.success("Purchase Order deleted"); }} />
      </> : null}
    </WorkspaceContent>
  </div>;
}
