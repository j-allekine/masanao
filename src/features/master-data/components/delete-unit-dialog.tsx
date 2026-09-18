"use client";

import { useState, useTransition } from "react";

import DestructiveDialog from "@/components/workspace/destructive-dialog";

import { deleteUnitAction } from "../actions";
import type { UnitListItem } from "../types";

export default function DeleteUnitDialog({
  unit,
  open,
  onOpenChange,
  onDeleted,
}: {
  unit: UnitListItem;
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
        const result = await deleteUnitAction(unit.id);

        if (result.status === "error") {
          setError(result.error);
          return;
        }

        onOpenChange(false);
        onDeleted();
      } catch {
        setError(
          "The Unit could not be deleted. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <DestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete “${unit.name}”?`}
      description={
        <>
          This permanently removes the Unit from the catalog. A Unit that is
          referenced by an Item or Item Unit Conversion cannot be deleted; deactivate it instead.
        </>
      }
      error={error}
      isPending={isDeleting}
      onConfirm={handleDelete}
      confirmLabel="Delete Unit"
    />
  );
}
