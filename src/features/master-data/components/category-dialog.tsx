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

import type { CategoryListItem } from "../types";
import CategoryForm from "./category-form";

export type CategoryDialogState =
  | { mode: "create" }
  | { mode: "edit"; category: CategoryListItem };

export default function CategoryDialog({
  dialogState,
  onClose,
  onSuccess,
}: {
  dialogState: CategoryDialogState | null;
  onClose: () => void;
  onSuccess: (category: CategoryListItem) => void;
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
    dialogState?.mode === "edit" ? "Edit Category" : "Add Category";

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
                  ? "Update the Category name or description. Names are unique regardless of capitalization."
                  : "Add a flat organizational label for future Item records."}
              </DialogDescription>
            </DialogHeader>
            <CategoryForm
              key={
                dialogState.mode === "edit"
                  ? `edit-${dialogState.category.id}`
                  : "create"
              }
              mode={dialogState.mode}
              category={
                dialogState.mode === "edit"
                  ? dialogState.category
                  : undefined
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
              Your unsaved Category changes will be lost.
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
