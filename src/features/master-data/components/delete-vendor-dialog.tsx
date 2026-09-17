"use client";

import { useState, useTransition } from "react";

import DestructiveDialog from "@/components/workspace/destructive-dialog";

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
    <DestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete “${vendor.name}”?`}
      description={
        <>
          This permanently removes the Vendor from the catalog. A Vendor
          already referenced by procurement or receiving records cannot be
          deleted.
        </>
      }
      error={error}
      isPending={isDeleting}
      onConfirm={handleDelete}
      confirmLabel="Delete Vendor"
    />
  );
}
