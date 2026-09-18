"use client";

import { useState, useTransition } from "react";

import DestructiveDialog from "@/components/workspace/destructive-dialog";

import { deleteItemAction } from "../actions";
import type { ItemListItem } from "../types";

export default function DeleteItemDialog({
  item,
  open,
  onOpenChange,
  onDeleted,
}: {
  item: ItemListItem;
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
        const result = await deleteItemAction(item.id);

        if (result.status === "error") {
          setError(result.error);
          return;
        }

        onOpenChange(false);
        onDeleted();
      } catch {
        setError(
          "The Item could not be deleted. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <DestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete “${item.name}”?`}
      description={
        <>
          This permanently removes the Item from the catalog. An Item that is
          referenced by operational records or configured alternate Units cannot be deleted.
        </>
      }
      error={error}
      isPending={isDeleting}
      onConfirm={handleDelete}
      confirmLabel="Delete Item"
      pendingLabel="Deleting..."
    />
  );
}
