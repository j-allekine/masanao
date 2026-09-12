"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

import { deleteOfficeAction } from "../actions";
import type { OfficeListItem } from "../types";

export default function DeleteOfficeDialog({
  office,
  open,
  onOpenChange,
  onDeleted,
}: {
  office: OfficeListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    setError(null);

    startDeleteTransition(async () => {
      try {
        const result = await deleteOfficeAction(office.id);

        if (result.status === "error") {
          setError(result.error);
          router.refresh();
          return;
        }

        onOpenChange(false);
        onDeleted();
      } catch {
        setError(
          "The Office could not be deleted. Check your connection and try again.",
        );
        router.refresh();
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{office.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the Office from the catalog. An Office
            referenced by another record cannot be deleted.
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
            {isDeleting ? "Deleting…" : "Delete Office"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
