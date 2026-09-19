import Link from "next/link";
import { ClipboardList, FilePlus2, FileText, Inbox } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { PurchaseOrderDetailItem } from "../types";

function displayValue(value: string | null) {
  return value ?? "Not recorded";
}

export default function PurchaseOrderDetailContent({
  purchaseOrder,
}: {
  purchaseOrder: PurchaseOrderDetailItem;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-card">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-8" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-heading-3 font-semibold">Supply Operations</p>
            <p className="truncate text-body-sm text-muted-foreground">
              Review Purchase Order receiving context.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-label font-medium uppercase tracking-label text-primary">
              Purchase Order
            </p>
            <h1 className="break-words text-heading-1 font-semibold">
              {purchaseOrder.purchaseOrderNo}
            </h1>
            <p className="text-body text-muted-foreground">
              Review its vendor context and recorded Delivery Receipts.
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText aria-hidden="true" />
              Document context
            </CardTitle>
            <CardDescription>
              The reference details recorded for this Purchase Order.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="min-w-0">
              <p className="text-label font-medium text-muted-foreground">Vendor</p>
              <p className="break-words text-body font-medium">{purchaseOrder.vendor.name}</p>
            </div>
            <div className="min-w-0">
              <p className="text-label font-medium text-muted-foreground">Reference number</p>
              <p className="break-words text-body">{displayValue(purchaseOrder.referenceNumber)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-label font-medium text-muted-foreground">Note</p>
              <p className="break-words text-body">{displayValue(purchaseOrder.note)}</p>
            </div>
          </CardContent>
        </Card>

        <section aria-labelledby="delivery-receipt-history-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
            <h2 id="delivery-receipt-history-title" className="text-heading-2 font-semibold">
              Delivery Receipt history
            </h2>
            <p className="text-body text-muted-foreground">
              Posted receipts will remain visible here as this order is received.
            </p>
            </div>
            <Link href={`/purchase-orders/${purchaseOrder.id}/record-delivery`} className={buttonVariants({ variant: "default" })}>
              <FilePlus2 data-icon="inline-start" aria-hidden="true" />
              Record delivery
            </Link>
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
          </Empty> : <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Receipt number</TableHead><TableHead>Receipt date</TableHead><TableHead>Lines</TableHead><TableHead>Posted</TableHead></TableRow></TableHeader><TableBody>{purchaseOrder.deliveryReceipts.map((receipt) => <TableRow key={receipt.id} id={`delivery-receipt-${receipt.id}`}><TableCell className="font-medium">{receipt.receiptNo}</TableCell><TableCell>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(receipt.receiptDate))}</TableCell><TableCell>{receipt.lineCount}</TableCell><TableCell>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(receipt.postedAt))}</TableCell></TableRow>)}</TableBody></Table></div>}
        </section>
      </main>
    </div>
  );
}
