"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  items,
}: {
  purchaseOrderId: string;
  vendorName: string;
  items: ItemListItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function returnToOrder() {
    router.push(`/purchase-orders/${purchaseOrderId}`);
  }

  return <Dialog disablePointerDismissal open={open} onOpenChange={(nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) returnToOrder();
  }}>
    <DialogContent
      className="max-h-[calc(100svh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto p-0 sm:max-w-6xl"
      showCloseButton
    >
      <DialogHeader className="sticky top-0 z-10 border-b bg-popover px-6 py-5 pr-14">
        <p className="text-label font-medium uppercase tracking-label text-primary">
          Purchase Order · Delivery Receipt
        </p>
        <DialogTitle>Record delivery</DialogTitle>
        <DialogDescription>Vendor: {vendorName}</DialogDescription>
      </DialogHeader>
      <DeliveryReceiptForm
        purchaseOrderId={purchaseOrderId}
        items={items}
        presentation="dialog"
      />
    </DialogContent>
  </Dialog>;
}
