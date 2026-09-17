"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import DestructiveDialog from "@/components/workspace/destructive-dialog";

import { deleteCategoryAction } from "../actions";
import type { CategoryListItem } from "../types";

export default function DeleteCategoryDialog({
  category,
  open,
  onOpenChange,
  onDeleted,
}: {
  category: CategoryListItem;
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
        const result = await deleteCategoryAction(category.id);

        if (result.status === "error") {
          setError(result.error);
          router.refresh();
          return;
        }

        onOpenChange(false);
        onDeleted();
      } catch {
        setError(
          "The Category could not be deleted. Check your connection and try again.",
        );
        router.refresh();
      }
    });
  }

  return (
    <DestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete “${category.name}”?`}
      description={
        <>
          This permanently removes the Category from the catalog. A Category
          referenced by an Item cannot be deleted; deactivate it instead.
        </>
      }
      error={error}
      isPending={isDeleting}
      onConfirm={handleDelete}
      confirmLabel="Delete Category"
    />
  );
}
