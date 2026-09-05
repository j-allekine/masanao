"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  setCategoryActiveAction,
} from "../actions";
import type { CategoryListItem } from "../types";
import CategoryDialog, { type CategoryDialogState } from "./category-dialog";
import CategoryTable from "./category-table";

export default function CategoriesWorkspace({
  categories,
  canManage,
}: {
  categories: CategoryListItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [dialogState, setDialogState] = useState<CategoryDialogState | null>(
    null,
  );
  const [isMutating, startMutation] = useTransition();

  function openCreateDialog() {
    setDialogState({ mode: "create" });
  }

  function openEditDialog(category: CategoryListItem) {
    setDialogState({ mode: "edit", category });
  }

  function closeDialog() {
    const closedDialog = dialogState;
    setDialogState(null);

    window.setTimeout(() => {
      const targetId =
        closedDialog?.mode === "edit"
          ? `category-actions-${closedDialog.category.id}`
          : "new-category";
      document.getElementById(targetId)?.focus();
    }, 0);
  }

  function handleSetActive(category: CategoryListItem, isActive: boolean) {
    startMutation(async () => {
      try {
        const result = await setCategoryActiveAction(category.id, isActive);

        if (result.status === "error") {
          toast.error(result.error);
          router.refresh();
          return;
        }

        router.refresh();
        toast.success(
          `Category “${category.name}” ${result.category.isActive ? "activated" : "deactivated"}`,
        );
      } catch {
        toast.error(
          "The Category status could not be changed. Check your connection and try again.",
        );
        router.refresh();
      }
    });
  }

  function handleDeleted(category: CategoryListItem) {
    router.refresh();
    toast.success(`Category “${category.name}” deleted`);
    window.setTimeout(() => {
      document.getElementById("new-category")?.focus();
    }, 0);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-heading-3 font-semibold">Categories</h2>
          <p className="text-body-sm text-muted-foreground">
            Maintain flat organizational labels for future Items.
          </p>
        </div>
        {canManage ? (
          <Button
            id="new-category"
            type="button"
            size="sm"
            className="h-9 w-full sm:w-auto sm:min-w-[9rem]"
            onClick={openCreateDialog}
          >
            Add Category
          </Button>
        ) : null}
      </div>
      <CategoryTable
        categories={categories}
        canManage={canManage}
        onNew={openCreateDialog}
        onEdit={openEditDialog}
        onSetActive={handleSetActive}
        onDeleted={handleDeleted}
        actionDisabled={isMutating}
      />
      <CategoryDialog
        dialogState={dialogState}
        onClose={closeDialog}
        onSuccess={(category) => {
          const mode = dialogState?.mode;
          closeDialog();
          router.refresh();
          toast.success(
            mode === "edit"
              ? `Category “${category.name}” updated`
              : `Category “${category.name}” created`,
          );
        }}
      />
    </div>
  );
}
