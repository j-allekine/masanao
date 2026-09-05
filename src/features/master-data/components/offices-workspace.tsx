"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setOfficeActiveAction } from "../actions";
import type { OfficeListItem } from "../types";
import OfficeDialog, { type OfficeDialogState } from "./office-dialog";
import MasterDataCatalogLayout from "./master-data-catalog-layout";
import OfficePagination from "./office-pagination";
import OfficeTable from "./office-table";
import { type OfficeFilters } from "./office-filters";

const PAGE_SIZE = 10;

export default function OfficesWorkspace({
  offices,
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
  offices: OfficeListItem[];
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
  const [dialogState, setDialogState] = useState<OfficeDialogState | null>(
    null,
  );
  const [isMutating, startMutation] = useTransition();
  const filters: OfficeFilters = { search };

  function openCreateDialog() {
    setDialogState({ mode: "create" });
  }

  function openEditDialog(office: OfficeListItem) {
    setDialogState({ mode: "edit", office });
  }

  function closeDialog() {
    const closedDialog = dialogState;
    setDialogState(null);

    window.setTimeout(() => {
      const targetId =
        closedDialog?.mode === "edit"
          ? `office-actions-${closedDialog.office.id}`
          : "new-office";
      document.getElementById(targetId)?.focus();
    }, 0);
  }

  function handleToggle(office: OfficeListItem) {
    startMutation(async () => {
      try {
        const result = await setOfficeActiveAction(
          office.id,
          !office.isActive,
        );

        if (result.status === "error") {
          toast.error(result.error);
          router.refresh();
          return;
        }

        router.refresh();
        toast.success(
          `Office “${office.name}” ${result.office.isActive ? "activated" : "deactivated"}`,
        );
        window.setTimeout(() => {
          document.getElementById(`office-actions-${office.id}`)?.focus();
        }, 0);
      } catch {
        toast.error(
          "The Office status could not be changed. Check your connection and try again.",
        );
        router.refresh();
      }
    });
  }

  function handleDeleted(office: OfficeListItem) {
    const deletedIndex = offices.findIndex(
      (currentOffice) => currentOffice.id === office.id,
    );
    const nextFocusTarget =
      offices[deletedIndex + 1] ?? offices[deletedIndex - 1];
    const remainingOfficeCount = Math.max(total - 1, 0);
    const nextPageCount = Math.max(
      1,
      Math.ceil(remainingOfficeCount / PAGE_SIZE),
    );
    const nextPage = Math.min(page, nextPageCount);

    onPageChange(nextPage);
    router.refresh();
    toast.success(`Office “${office.name}” deleted`);

    window.setTimeout(() => {
      const targetId = nextFocusTarget
        ? `office-actions-${nextFocusTarget.id}`
        : "new-office";
      document.getElementById(targetId)?.focus();
    }, 0);
  }

  return (
    <MasterDataCatalogLayout
      resourceKey="office"
      resourceLabels={{ singular: "Office", plural: "Offices" }}
      search={search}
      onSearchChange={onSearchChange}
      canCreate={canManage}
      onCreate={openCreateDialog}
    >
      <OfficeTable
        offices={offices}
        filters={filters}
        onClearFilters={onClearFilters}
        canManage={canManage}
        onNew={openCreateDialog}
        onEdit={openEditDialog}
        onToggle={handleToggle}
        onDeleted={handleDeleted}
        actionDisabled={dialogState !== null || isMutating}
      />
      <OfficePagination
        page={page}
        pageCount={pageCount}
        start={start}
        end={end}
        total={total}
        onPageChange={onPageChange}
      />
      <OfficeDialog
        dialogState={dialogState}
        onClose={closeDialog}
        onSuccess={(office) => {
          const mode = dialogState?.mode;
          closeDialog();
          router.refresh();
          toast.success(
            mode === "edit"
              ? `Office “${office.name}” updated`
              : `Office “${office.name}” created`,
          );
        }}
      />
    </MasterDataCatalogLayout>
  );
}
