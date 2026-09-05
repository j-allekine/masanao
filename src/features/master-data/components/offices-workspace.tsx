"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { OfficeListItem } from "../types";
import OfficeDialog, { type OfficeDialogState } from "./office-dialog";
import MasterDataCatalogLayout from "./master-data-catalog-layout";
import OfficePagination from "./office-pagination";
import OfficeTable from "./office-table";
import { type OfficeFilters } from "./office-filters";

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
        actionDisabled={dialogState !== null}
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
