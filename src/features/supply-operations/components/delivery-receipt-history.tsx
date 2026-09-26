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

import { addExactPositiveDecimals, formatDeliveryReceiptAmount } from "../domain/delivery-receipt";
import type { DeliveryReceiptHistoryItem } from "../types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function formatPostedAt(value: string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function receiptTotal(receipt: DeliveryReceiptHistoryItem) {
  const amounts = receipt.lines.flatMap((line) => line.lineAmount ? [line.lineAmount] : []);
  return amounts.length === 0 ? null : amounts.reduce(addExactPositiveDecimals, "0");
}

export default function DeliveryReceiptHistory({
  deliveryReceipts,
}: {
  deliveryReceipts: DeliveryReceiptHistoryItem[];
}) {
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const selectedReceipt = deliveryReceipts.find((receipt) => receipt.id === selectedReceiptId) ?? null;
  const total = selectedReceipt ? receiptTotal(selectedReceipt) : null;

  return <>
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Receipt number</TableHead>
            <TableHead>Receipt date</TableHead>
            <TableHead>Lines</TableHead>
            <TableHead>Posted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveryReceipts.map((receipt) => <TableRow key={receipt.id} id={`delivery-receipt-${receipt.id}`}>
            <TableCell className="font-medium">
              <Button variant="link" className="h-auto p-0 font-medium" onClick={() => setSelectedReceiptId(receipt.id)}>
                {receipt.receiptNo}
              </Button>
            </TableCell>
            <TableCell>{formatDate(receipt.receiptDate)}</TableCell>
            <TableCell>{receipt.lines.length}</TableCell>
            <TableCell>{formatPostedAt(receipt.postedAt)}</TableCell>
          </TableRow>)}
        </TableBody>
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
              {total ? <TableFooter><TableRow><TableCell colSpan={5} className="text-right font-medium">Total</TableCell><TableCell className="text-right font-medium">₱ {formatDeliveryReceiptAmount(total)}</TableCell></TableRow></TableFooter> : null}
            </Table>
          </div>
          <div className="flex flex-col gap-1"><p className="text-label font-medium text-muted-foreground">Receipt note</p><p className="whitespace-pre-wrap">{selectedReceipt.note ?? "Not recorded"}</p></div>
        </div>
        <DialogFooter showCloseButton />
      </DialogContent> : null}
    </Dialog>
  </>;
}
