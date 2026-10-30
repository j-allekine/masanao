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

import type { VendorListItem } from "../types";
import VendorForm from "./vendor-form";

export type VendorDialogState =
  | { mode: "create" }
  | { mode: "edit"; vendor: VendorListItem };

export default function VendorDialog({
  dialogState,
  onClose,
  onSuccess,
}: {
  dialogState: VendorDialogState | null;
  onClose: () => void;
  onSuccess: (vendor: VendorListItem) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  const closeDialog = useCallback(() => {
    setIsDiscardDialogOpen(false);
    setIsDirty(false);
    setIsPending(false);
    onClose();
  }, [onClose]);

  function requestClose() {
    if (isPending) return;
    if (isDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeDialog();
  }

  const title = dialogState?.mode === "edit" ? "Edit Vendor" : "Create Vendor";

  return (
    <>
      <Dialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        {dialogState ? (
          <DialogContent size="entry" className="[&_[data-slot=dialog-close]]:size-10">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {dialogState.mode === "edit"
                  ? "Update the Vendor identity and contact information."
                  : "Add a supplier to the municipal kitchen catalog."}
              </DialogDescription>
            </DialogHeader>
            <VendorForm
              key={
                dialogState.mode === "edit"
                  ? `edit-${dialogState.vendor.id}`
                  : "create"
              }
              mode={dialogState.mode}
              vendor={
                dialogState.mode === "edit"
                  ? dialogState.vendor
                  : undefined
              }
              onCancel={requestClose}
              onSuccess={onSuccess}
              onDirtyChange={setIsDirty}
              onPendingChange={setIsPending}
            />
          </DialogContent>
        ) : null}
      </Dialog>

      <AlertDialog
        open={isDiscardDialogOpen}
        onOpenChange={setIsDiscardDialogOpen}
      >
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto [overflow-wrap:anywhere]">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved Vendor changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="[&_button]:h-auto [&_button]:min-h-10 [&_button]:py-2 [&_button]:whitespace-normal">
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
