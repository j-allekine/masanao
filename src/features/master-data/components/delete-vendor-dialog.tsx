"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Spinner } from "@/components/ui/spinner";

import { deleteVendorAction } from "../actions";
import type { VendorListItem } from "../types";

export default function DeleteVendorDialog({
  vendor,
  open,
  onOpenChange,
  onDeleted,
}: {
  vendor: VendorListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    setError(null);

    startDeleteTransition(async () => {
      try {
        const result = await deleteVendorAction(vendor.id);

        if (result.status === "error") {
          setError(result.error);
          return;
        }

        onOpenChange(false);
        onDeleted();
      } catch {
        setError(
          "The Vendor could not be deleted. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{vendor.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the Vendor from the catalog. A Vendor
            already referenced by procurement or receiving records cannot be
            deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Deletion failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Trash2 data-icon="inline-start" />
            )}
            {isDeleting ? "Deleting…" : "Delete Vendor"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
