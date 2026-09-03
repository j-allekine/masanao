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

import type { UnitListItem } from "../types";
import UnitForm from "./unit-form";

export type UnitDialogState =
  | { mode: "create" }
  | { mode: "edit"; unit: UnitListItem };

export default function UnitDialog({
  dialogState,
  onClose,
  onSuccess,
}: {
  dialogState: UnitDialogState | null;
  onClose: () => void;
  onSuccess: (unit: UnitListItem) => void;
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

  const title =
    dialogState?.mode === "edit" ? "Edit Unit" : "Create Unit";

  return (
    <>
      <Dialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        {dialogState ? (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {dialogState.mode === "edit"
                  ? "Update the Unit name or abbreviation. Duplicate normalized values are not allowed."
                  : "Add an approved Unit to the municipal kitchen catalog."}
              </DialogDescription>
            </DialogHeader>
            <UnitForm
              key={
                dialogState.mode === "edit"
                  ? `edit-${dialogState.unit.id}`
                  : "create"
              }
              mode={dialogState.mode}
              unit={dialogState.mode === "edit" ? dialogState.unit : undefined}
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
              Your unsaved Unit changes will be lost.
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
