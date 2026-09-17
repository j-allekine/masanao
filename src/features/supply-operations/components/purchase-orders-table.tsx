import {
  ClipboardList,
  FileText,
} from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WorkspaceTableFrame from "@/components/workspace/table-frame";

import type { PurchaseOrderListItem } from "../types";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function formatUpdatedAt(value: string) {
  return dateFormatter.format(new Date(value));
}

function displayReference(referenceNumber: string | null) {
  return referenceNumber ?? "Not recorded";
}

function PurchaseOrderMobileCard({
  purchaseOrder,
}: {
  purchaseOrder: PurchaseOrderListItem;
}) {
  return (
    <Card size="sm" data-purchase-order-id={purchaseOrder.id}>
      <CardHeader>
        <CardTitle className="break-words">{purchaseOrder.purchaseOrderNo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <span className="text-label font-semibold text-muted-foreground">Vendor</span>
          <span className="min-w-0 break-words text-right">
            {purchaseOrder.vendor.name}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-label font-semibold text-muted-foreground">
            Reference
          </span>
          <span className="min-w-0 break-words text-right">
            {displayReference(purchaseOrder.referenceNumber)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-label font-semibold text-muted-foreground">
            Last updated
          </span>
          <span className="min-w-0 break-words text-right">
            {formatUpdatedAt(purchaseOrder.updatedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PurchaseOrdersTable({
  purchaseOrders,
}: {
  purchaseOrders: PurchaseOrderListItem[];
}) {
  if (purchaseOrders.length === 0) {
    return (
      <Empty className="min-h-60 rounded-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Purchase Orders yet.</EmptyTitle>
          <EmptyDescription>
            Purchase Orders will appear here once an administrator records an order reference.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:hidden" data-purchase-orders-mobile>
        {purchaseOrders.map((purchaseOrder) => (
          <PurchaseOrderMobileCard
            key={purchaseOrder.id}
            purchaseOrder={purchaseOrder}
          />
        ))}
      </div>
      <div className="hidden sm:block" data-purchase-orders-table-desktop>
        <WorkspaceTableFrame caption="Purchase Orders" className="min-w-[42rem]">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead scope="col" className="text-left">
                Purchase Order No.
              </TableHead>
              <TableHead scope="col" className="text-left">
                Vendor
              </TableHead>
              <TableHead scope="col" className="text-left">
                Reference
              </TableHead>
              <TableHead scope="col" className="text-left">
                Last updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.map((purchaseOrder) => (
              <TableRow
                key={purchaseOrder.id}
                className="hover:bg-muted/35"
                data-purchase-order-id={purchaseOrder.id}
              >
                <TableCell className="max-w-[18rem] whitespace-normal align-top">
                  <span className="block break-words">
                    <FileText className="mr-2 inline-block align-text-bottom" aria-hidden="true" />
                    {purchaseOrder.purchaseOrderNo}
                  </span>
                </TableCell>
                <TableCell className="max-w-[18rem] whitespace-normal align-top">
                  <span className="block break-words">{purchaseOrder.vendor.name}</span>
                </TableCell>
                <TableCell className="max-w-[18rem] whitespace-normal align-top">
                  <span className="block break-words">
                    {displayReference(purchaseOrder.referenceNumber)}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap align-top">
                  {formatUpdatedAt(purchaseOrder.updatedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </WorkspaceTableFrame>
      </div>
    </>
  );
}
