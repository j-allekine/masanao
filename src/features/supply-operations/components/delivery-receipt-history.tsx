"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatDeliveryReceiptAmount } from "../domain/delivery-receipt";
import { summarizePurchaseOrderDeliveries } from "../domain/purchase-order-delivery-summary";
import type { DeliveryReceiptHistoryItem } from "../types";
import PurchaseOrderDeliveredAmount from "./purchase-order-delivered-amount";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function formatPostedAt(value: string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function DeliveryReceiptHistory({
  deliveryReceipts,
}: {
  deliveryReceipts: DeliveryReceiptHistoryItem[];
}) {
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const selectedReceipt = deliveryReceipts.find((receipt) => receipt.id === selectedReceiptId) ?? null;
  const total = summarizePurchaseOrderDeliveries(deliveryReceipts);

  return <>
    <div className="min-w-0 overflow-x-auto rounded-lg border">
      <Table>
        <caption className="sr-only">Delivery Receipt history and delivered amounts</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Receipt number</TableHead>
            <TableHead className="hidden sm:table-cell">Receipt date</TableHead>
            <TableHead className="hidden sm:table-cell">Lines</TableHead>
            <TableHead className="min-w-32 px-3 text-right sm:px-6">Amount</TableHead>
            <TableHead className="hidden sm:table-cell">Posted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveryReceipts.map((receipt) => <TableRow key={receipt.id} id={`delivery-receipt-${receipt.id}`}>
            <TableCell className="max-w-[20rem] whitespace-normal font-medium">
              <Button variant="link" className="h-auto whitespace-normal break-all p-0 text-left font-medium" onClick={() => setSelectedReceiptId(receipt.id)}>
                {receipt.receiptNo}
              </Button>
            </TableCell>
            <TableCell className="hidden sm:table-cell">{formatDate(receipt.receiptDate)}</TableCell>
            <TableCell className="hidden sm:table-cell">{receipt.lines.length}</TableCell>
            <TableCell className="min-w-32 px-3 whitespace-normal text-right sm:px-6" data-receipt-amount>
              <PurchaseOrderDeliveredAmount summary={summarizePurchaseOrderDeliveries([receipt])} />
            </TableCell>
            <TableCell className="hidden sm:table-cell">{formatPostedAt(receipt.postedAt)}</TableCell>
          </TableRow>)}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="hidden sm:table-cell">Total delivered</TableCell>
            <TableCell className="sm:hidden">Total delivered</TableCell>
            <TableCell className="min-w-32 px-3 whitespace-normal text-right sm:px-6" data-delivery-history-total><PurchaseOrderDeliveredAmount summary={total} /></TableCell>
            <TableCell className="hidden sm:table-cell" />
          </TableRow>
        </TableFooter>
      </Table>
    </div>

    <Dialog open={selectedReceipt !== null} onOpenChange={(open) => { if (!open) setSelectedReceiptId(null); }}>
      {selectedReceipt ? <DialogContent className="max-h-[calc(100svh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto p-0 sm:max-w-6xl" showCloseButton>
        <DialogHeader className="sticky top-0 z-10 border-b bg-popover px-6 py-5 pr-14">
          <p className="text-label font-medium uppercase tracking-label text-primary">Purchase Order · Delivery Receipt</p>
          <DialogTitle>Delivery receipt {selectedReceipt.receiptNo}</DialogTitle>
          <DialogDescription>Vendor: {selectedReceipt.vendorName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 px-6 py-5">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1"><dt className="text-label font-medium text-muted-foreground">Purchase Order</dt><dd>{selectedReceipt.purchaseOrderNo}</dd></div>
            <div className="flex flex-col gap-1"><dt className="text-label font-medium text-muted-foreground">Receipt date</dt><dd>{formatDate(selectedReceipt.receiptDate)}</dd></div>
            <div className="flex flex-col gap-1"><dt className="text-label font-medium text-muted-foreground">Posted</dt><dd>{formatPostedAt(selectedReceipt.postedAt)}</dd></div>
          </dl>
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-220">
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Delivered Qty</TableHead><TableHead className="text-right">Base Unit Qty</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{selectedReceipt.lines.map((line) => <TableRow key={line.id}>
                <TableCell className="font-medium">{line.itemName}</TableCell>
                <TableCell>{line.selectedUnitName}</TableCell>
                <TableCell className="text-right">{line.enteredQuantity}</TableCell>
                <TableCell className="text-right">{line.calculatedBaseUnitQuantity} {line.baseUnitName}</TableCell>
                <TableCell className="text-right">{line.unitPrice ? `₱ ${formatDeliveryReceiptAmount(line.unitPrice)}` : "Not recorded"}</TableCell>
                <TableCell className="text-right">{line.lineAmount ? `₱ ${formatDeliveryReceiptAmount(line.lineAmount)}` : "Not recorded"}</TableCell>
              </TableRow>)}</TableBody>
              <TableFooter><TableRow><TableCell colSpan={5} className="text-right font-medium">Total</TableCell><TableCell className="text-right font-medium"><PurchaseOrderDeliveredAmount summary={summarizePurchaseOrderDeliveries([selectedReceipt])} /></TableCell></TableRow></TableFooter>
            </Table>
          </div>
          <div className="flex flex-col gap-1"><p className="text-label font-medium text-muted-foreground">Receipt note</p><p className="whitespace-pre-wrap">{selectedReceipt.note ?? "Not recorded"}</p></div>
        </div>
        <DialogFooter className="mx-0 mb-0" showCloseButton />
      </DialogContent> : null}
    </Dialog>
  </>;
}
