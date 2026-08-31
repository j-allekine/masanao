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

import type { ActivityDesignListItem } from "../types";
import ActivityDesignForm from "./forms/activity-design-form";

export type ActivityDesignDialogState =
  | { mode: "create" }
  | { mode: "edit"; activityDesign: ActivityDesignListItem };

export default function ActivityDesignDialog({
  dialogState,
  onClose,
  onSuccess,
}: {
  dialogState: ActivityDesignDialogState | null;
  onClose: () => void;
  onSuccess: () => void;
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
    dialogState?.mode === "edit"
      ? "Edit Activity Design"
      : "New Activity Design";

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
                  ? "Update this planning context. Changes to its number are checked for duplicates before saving."
                  : "Create a planning context for related Activities."}
              </DialogDescription>
            </DialogHeader>
            <ActivityDesignForm
              key={
                dialogState.mode === "edit"
                  ? `edit-${dialogState.activityDesign.id}`
                  : "create"
              }
              mode={dialogState.mode}
              activityDesign={
                dialogState.mode === "edit"
                  ? dialogState.activityDesign
                  : undefined
              }
              onCancel={requestClose}
              onSuccess={() => {
                closeDialog();
                onSuccess();
              }}
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
              Your unsaved Activity Design changes will be lost.
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
