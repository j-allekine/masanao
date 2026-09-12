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

import type { CategoryListItem, ItemListItem, UnitListItem } from "../types";
import ItemForm from "./item-form";

export default function ItemCreateDialog({
  open,
  item,
  categories,
  units,
  onClose,
  onSuccess,
}: {
  open: boolean;
  item?: ItemListItem;
  categories: CategoryListItem[];
  units: UnitListItem[];
  onClose: () => void;
  onSuccess: (item: ItemListItem) => void;
}) {
  const mode = item ? "edit" : "create";
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{mode === "edit" ? "Edit Item" : "Add Item"}</DialogTitle>
              <DialogDescription>
                {mode === "edit"
                  ? "Correct the Item definition. Assigned inactive lookups remain available unless you choose an active replacement."
                  : "Add a supply to the active municipal kitchen catalog."}
              </DialogDescription>
            </DialogHeader>
            <ItemForm
              key={item ? `edit-${item.id}` : "create"}
              mode={mode}
              item={item}
              categories={categories}
              units={units}
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
              Your unsaved Item changes will be lost.
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
