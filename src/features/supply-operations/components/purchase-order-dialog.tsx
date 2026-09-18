"use client";

import { useCallback, useState } from "react";

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

import type {
  PurchaseOrderListItem,
  PurchaseOrderVendorOption,
} from "../types";
import PurchaseOrderForm from "./purchase-order-form";

export default function PurchaseOrderDialog({
  open,
  purchaseOrder,
  vendors,
  onClose,
  onSuccess,
}: {
  open: boolean;
  purchaseOrder?: PurchaseOrderListItem;
  vendors: PurchaseOrderVendorOption[];
  onClose: () => void;
  onSuccess: (purchaseOrder: PurchaseOrderListItem) => void;
}) {
  const mode = purchaseOrder ? "edit" : "create";
  const [isDirty, setIsDirty] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  const closeDialog = useCallback(() => {
    setIsDiscardDialogOpen(false);
    setIsDirty(false);
    onClose();
  }, [onClose]);

  function requestClose() {
    if (isDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeDialog();
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) requestClose();
        }}
      >
        {open ? (
          <DialogContent className="max-h-[calc(100svh-2rem)] max-w-lg grid-rows-[auto_minmax(0,1fr)]">
            <DialogHeader>
              <DialogTitle>
                {mode === "edit" ? "Edit Purchase Order" : "Add Purchase Order"}
              </DialogTitle>
              <DialogDescription>
                {mode === "edit"
                  ? "Correct the Vendor or reference used for this Purchase Order."
                  : "Record the vendor and reference used to receive supplies. Items and quantities are recorded when supplies arrive."}
              </DialogDescription>
            </DialogHeader>
            <PurchaseOrderForm
              key={purchaseOrder ? `edit-${purchaseOrder.id}` : "create"}
              mode={mode}
              purchaseOrder={purchaseOrder}
              vendors={vendors}
              onCancel={requestClose}
              onSuccess={onSuccess}
              onDirtyChange={setIsDirty}
            />
          </DialogContent>
        ) : null}
      </Dialog>

      <AlertDialog
        open={isDiscardDialogOpen}
        onOpenChange={setIsDiscardDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved Purchase Order changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={closeDialog}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
