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

import type { OfficeListItem } from "../types";
import OfficeForm from "./office-form";

export type OfficeDialogState =
  | { mode: "create" }
  | { mode: "edit"; office: OfficeListItem };

export default function OfficeDialog({
  dialogState,
  onClose,
  onSuccess,
}: {
  dialogState: OfficeDialogState | null;
  onClose: () => void;
  onSuccess: (office: OfficeListItem) => void;
}) {
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

  const title = dialogState?.mode === "edit" ? "Edit Office" : "Add Office";

  return (
    <>
      <Dialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        {dialogState ? (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {dialogState.mode === "edit"
                  ? "Update the Office identity and directory context. Name and abbreviation conflicts are not allowed."
                  : "Add an Office to the municipal directory. Name is required; the remaining directory fields are optional."}
              </DialogDescription>
            </DialogHeader>
            <OfficeForm
              key={
                dialogState.mode === "edit"
                  ? `edit-${dialogState.office.id}`
                  : "create"
              }
              mode={dialogState.mode}
              office={
                dialogState.mode === "edit" ? dialogState.office : undefined
              }
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
              Your unsaved Office changes will be lost.
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
