import { useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  FileText,
} from "lucide-react";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import { ListEmptyState } from "@/components/workspace/list-empty-state";

import type { PurchaseOrderListItem } from "../types";
import DeletePurchaseOrderDialog from "./delete-purchase-order-dialog";
import PurchaseOrderActionsMenu from "./purchase-order-actions-menu";
import PurchaseOrderDeliveredAmount from "./purchase-order-delivered-amount";
import { withPurchaseOrderReturn } from "./purchase-order-return-state";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function formatUpdatedAt(value: string) {
  return dateFormatter.format(new Date(value));
}

function PurchaseOrderRow({
  purchaseOrder,
  canManage,
  actionDisabled,
  amountsUnavailable,
  catalogUrl,
  onEdit,
  onDeleted,
}: {
  purchaseOrder: PurchaseOrderListItem;
  canManage: boolean;
  actionDisabled: boolean;
  amountsUnavailable?: boolean;
  catalogUrl: string;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <TableRow
        className="hover:bg-muted/35"
        data-purchase-order-id={purchaseOrder.id}
      >
        <TableCell data-primary data-label="Purchase Order No." className="w-[27%]">
          <Link
            href={withPurchaseOrderReturn(`/purchase-orders/${purchaseOrder.id}`, catalogUrl)}
            className="block break-words rounded-sm underline underline-offset-4 hover:decoration-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <FileText
              className="mr-2 inline-block align-text-bottom"
              aria-hidden="true"
            />
            {purchaseOrder.purchaseOrderNo}
          </Link>
        </TableCell>
        <TableCell data-label="Vendor" className="w-[24%]">
          <span className="block break-words">{purchaseOrder.vendor.name}</span>
        </TableCell>
        <TableCell data-label="Total delivered" className="w-[23%] text-right tabular-nums">
          <PurchaseOrderDeliveredAmount summary={purchaseOrder.deliverySummary} unavailable={amountsUnavailable} />
        </TableCell>
        <TableCell data-label="Last updated" className="w-[16%]">
          {formatUpdatedAt(purchaseOrder.updatedAt)}
        </TableCell>
        {canManage ? (
          <TableCell data-actions className="w-[10%] text-right">
            <PurchaseOrderActionsMenu
              disabled={actionDisabled}
              purchaseOrderId={purchaseOrder.id}
              purchaseOrderNo={purchaseOrder.purchaseOrderNo}
              actionButtonId={`purchase-order-actions-${purchaseOrder.id}`}
              onEdit={onEdit}
              onDelete={() => setIsDeleteDialogOpen(true)}
              canDelete={!purchaseOrder.hasPostedReceipts}
            />
          </TableCell>
        ) : null}
      </TableRow>
      {canManage ? (
        <DeletePurchaseOrderDialog
          key={`${purchaseOrder.id}-${isDeleteDialogOpen ? "open" : "closed"}`}
          purchaseOrder={purchaseOrder}
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) window.setTimeout(() => {
              document.getElementById(`purchase-order-actions-${purchaseOrder.id}`)?.focus();
            }, 0);
          }}
          onDeleted={onDeleted}
        />
      ) : null}
    </>
  );
}

export default function PurchaseOrdersTable({
  purchaseOrders,
  hasFilters,
  onClearFilters,
  canManage,
  actionDisabled,
  amountsUnavailable,
  catalogUrl,
  onEdit,
  onDeleted,
}: {
  purchaseOrders: PurchaseOrderListItem[];
  hasFilters: boolean;
  onClearFilters: () => void;
  canManage: boolean;
  actionDisabled: boolean;
  amountsUnavailable?: boolean;
  catalogUrl: string;
  onEdit: (purchaseOrder: PurchaseOrderListItem) => void;
  onDeleted: (purchaseOrder: PurchaseOrderListItem) => void;
}) {
  if (purchaseOrders.length === 0) {
    return (
      <ListEmptyState
        icon={<ClipboardList aria-hidden="true" />}
        hasFilters={hasFilters}
        filteredState={{
          title: "No Purchase Orders match your current search.",
          description: "Clear the search to see the complete Purchase Orders list.",
          action: {
            label: "Clear search",
            variant: "outline",
            onClick: onClearFilters,
          },
        }}
        emptyState={{
          title: "No Purchase Orders yet.",
          description:
            "Purchase Orders will appear here once an administrator records an order reference.",
        }}
      />
    );
  }

  return (
    <div data-purchase-orders-catalog>
        <WorkspaceTableFrame caption="Purchase Orders" responsive>
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead scope="col" className="w-[27%] text-left">
                Purchase Order No.
              </TableHead>
              <TableHead scope="col" className="w-[24%] text-left">
                Vendor
              </TableHead>
              <TableHead scope="col" className="w-[23%] text-right">
                Total delivered
              </TableHead>
              <TableHead scope="col" className="w-[16%] text-left">
                Last updated
              </TableHead>
              {canManage ? (
                <TableHead scope="col" className="w-[10%] text-right">
                  Actions
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.map((purchaseOrder) => (
              <PurchaseOrderRow
                key={purchaseOrder.id}
                purchaseOrder={purchaseOrder}
                canManage={canManage}
                actionDisabled={actionDisabled}
                amountsUnavailable={amountsUnavailable}
                catalogUrl={catalogUrl}
                onEdit={() => onEdit(purchaseOrder)}
                onDeleted={() => onDeleted(purchaseOrder)}
              />
            ))}
          </TableBody>
        </WorkspaceTableFrame>
    </div>
  );
}
