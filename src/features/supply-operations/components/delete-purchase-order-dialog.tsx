"use client";

import { useState, useTransition } from "react";

import DestructiveDialog from "@/components/workspace/destructive-dialog";

import { deletePurchaseOrderAction } from "../actions";
import type { PurchaseOrderListItem } from "../types";

export default function DeletePurchaseOrderDialog({
  purchaseOrder,
  open,
  onOpenChange,
  onDeleted,
}: {
  purchaseOrder: PurchaseOrderListItem;
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
        const result = await deletePurchaseOrderAction(purchaseOrder.id);

        if (result.status === "error") {
          setError(result.error);
          return;
        }

        onOpenChange(false);
        onDeleted();
      } catch {
        setError(
          "The Purchase Order could not be deleted. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <DestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete “${purchaseOrder.purchaseOrderNo}”?`}
      description="This permanently removes the Purchase Order reference. Future receiving records that reference it will prevent deletion."
      error={error}
      isPending={isDeleting}
      onConfirm={handleDelete}
      confirmLabel="Delete Purchase Order"
      pendingLabel="Deleting..."
    />
  );
}
