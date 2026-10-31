"use client";

import { useRef } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ItemListItem } from "../types";
import DeliveryReceiptForm from "./delivery-receipt-form";

export default function DeliveryReceiptDialog({
  purchaseOrderId,
  vendorName,
  purchaseOrderNo,
  items,
}: {
  purchaseOrderId: string;
  vendorName: string;
  purchaseOrderNo: string;
  items: ItemListItem[];
}) {
  const closeRequestRef = useRef<(() => void) | null>(null);

  return <Dialog disablePointerDismissal open onOpenChange={(nextOpen) => {
    if (!nextOpen) closeRequestRef.current?.();
  }}>
    <DialogContent
      className="flex min-w-0 w-[calc(100%-2rem)] h-[min(52rem,calc(100svh-2rem))] max-h-[calc(100svh-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl [&>[data-slot=dialog-close]]:z-20 [&>[data-slot=dialog-close]]:right-[12px] [&>[data-slot=dialog-close]]:top-[12px] [&>[data-slot=dialog-close]]:size-[40px]"
      initialFocus={() => document.getElementById("receiptNo")}
      showCloseButton
    >
      <DialogHeader className="shrink-0 border-b bg-popover px-[16px] py-[12px] sm:px-6">
        <DialogTitle className="pr-[56px]">Record delivery</DialogTitle>
      </DialogHeader>
      <DeliveryReceiptForm
        purchaseOrderId={purchaseOrderId}
        items={items}
        presentation="dialog"
        closeRequestRef={closeRequestRef}
        context={<DialogDescription className="min-w-0 [overflow-wrap:anywhere]">PO: {purchaseOrderNo} · Vendor: {vendorName}</DialogDescription>}
      />
    </DialogContent>
  </Dialog>;
}
