"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import DestructiveDialog from "@/components/workspace/destructive-dialog";

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
    <DestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete “${office.name}”?`}
      description={
        <>
          This permanently removes the Office from the catalog. An Office
          referenced by another record cannot be deleted.
        </>
      }
      error={error}
      isPending={isDeleting}
      onConfirm={handleDelete}
      confirmLabel="Delete Office"
    />
  );
}
