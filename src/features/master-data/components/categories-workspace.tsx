"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import CatalogPagination from "@/components/workspace/catalog-pagination";
import {
  setCategoryActiveAction,
} from "../actions";
import type { CategoryListItem } from "../types";
import CategoryDialog, { type CategoryDialogState } from "./category-dialog";
import MasterDataCatalogLayout from "./master-data-catalog-layout";
import CategoryTable from "./category-table";

type CategoryFocusRequest = {
  targetId: string;
  sourceCategories: CategoryListItem[];
};

function focusCategoryDialogTrigger(targetId: string) {
  const target = document.getElementById(targetId);

  if (target) {
    target.focus();
    return;
  }

  document.getElementById("category-search")?.focus();
}

export default function CategoriesWorkspace({
  categories,
  total,
  search,
  page,
  pageCount,
  start,
  end,
  onSearchChange,
  onClearFilters,
  onPageChange,
  canManage,
}: {
  categories: CategoryListItem[];
  total: number;
  search: string;
  page: number;
  pageCount: number;
  start: number;
  end: number;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  canManage: boolean;
}) {
  const router = useRouter();
  const [dialogState, setDialogState] = useState<CategoryDialogState | null>(
    null,
  );
  const [pendingFocusRequest, setPendingFocusRequest] =
    useState<CategoryFocusRequest | null>(null);
  const [isMutating, startMutation] = useTransition();

  useEffect(() => {
    const request = pendingFocusRequest;
    if (!request || categories === request.sourceCategories) return;

    const timeoutId = window.setTimeout(() => {
      focusCategoryDialogTrigger(request.targetId);
      setPendingFocusRequest(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [categories, pendingFocusRequest]);

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
      focusCategoryDialogTrigger(targetId);
    }, 0);
  }

  function closeDialogAfterSuccess() {
    const closedDialog = dialogState;
    if (!closedDialog) return;

    setDialogState(null);
    setPendingFocusRequest({
      targetId:
        closedDialog.mode === "edit"
          ? `category-actions-${closedDialog.category.id}`
          : "new-category",
      sourceCategories: categories,
    });
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
    toast.success(`Category “${category.name}” deleted`);
    window.setTimeout(() => {
      document.getElementById("new-category")?.focus();
    }, 0);
  }

  return (
    <MasterDataCatalogLayout
      resourceKey="category"
      resourceLabels={{ singular: "Category", plural: "Categories" }}
      search={search}
      onSearchChange={onSearchChange}
      canCreate={canManage}
      onCreate={openCreateDialog}
      createLabel="Add Category"
    >
      <CategoryTable
        categories={categories}
        search={search}
        onClearFilters={onClearFilters}
        canManage={canManage}
        onNew={openCreateDialog}
        onEdit={openEditDialog}
        onSetActive={handleSetActive}
        onDeleted={handleDeleted}
        actionDisabled={isMutating}
      />
      <CatalogPagination
        page={page}
        pageCount={pageCount}
        start={start}
        end={end}
        total={total}
        onPageChange={onPageChange}
      />
      <CategoryDialog
        dialogState={dialogState}
        onClose={closeDialog}
        onSuccess={(category) => {
          const mode = dialogState?.mode;
          closeDialogAfterSuccess();
          toast.success(
            mode === "edit"
              ? `Category “${category.name}” updated`
              : `Category “${category.name}” created`,
          );
        }}
      />
    </MasterDataCatalogLayout>
  );
}
