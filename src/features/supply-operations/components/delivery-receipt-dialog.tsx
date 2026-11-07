"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  purchaseOrderNo,
  vendorName,
  items,
}: {
  purchaseOrderId: string;
  purchaseOrderNo: string;
  vendorName: string;
  items: ItemListItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [posting, setPosting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!open || !dirty) return;
    function confirmNavigation(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", confirmNavigation);
    return () => window.removeEventListener("beforeunload", confirmNavigation);
  }, [open, dirty]);

  function close() {
    setConfirmDiscard(false);
    setOpen(false);
  }

  function requestClose() {
    if (posting) return;
    if (dirty) setConfirmDiscard(true);
    else close();
  }

  return (
    <Dialog
      disablePointerDismissal
      open={open}
      onOpenChange={(nextOpen) => { if (!nextOpen) requestClose(); }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) router.replace(`/purchase-orders/${purchaseOrderId}`, { scroll: false });
      }}
    >
      <DialogContent
        className="min-w-0 max-h-[calc(100svh-2rem)] grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-0 p-0 sm:max-w-6xl"
        showCloseButton={!posting}
        finalFocus={() => document.getElementById("record-delivery-link")}
      >
        <DialogHeader className="border-b px-4 py-3 pr-12 sm:px-6 sm:pr-14">
          <DialogTitle>Record delivery</DialogTitle>
        </DialogHeader>
        <DeliveryReceiptForm
          purchaseOrderId={purchaseOrderId}
          items={items}
          presentation="dialog"
          context={
            <DialogDescription className="flex flex-col gap-1 wrap-anywhere">
              <span>Purchase Order: {purchaseOrderNo}</span>
              <span>Vendor: {vendorName}</span>
            </DialogDescription>
          }
          onCancel={requestClose}
          onDirty={() => setDirty(true)}
          onPostingChange={setPosting}
        />
        <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
          <AlertDialogContent size="sm" className="max-w-[calc(100%-2rem)]">
            <AlertDialogHeader>
              <AlertDialogTitle>Discard changes?</AlertDialogTitle>
              <AlertDialogDescription>Your unsaved delivery entry will be lost.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={close}>Discard changes</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
