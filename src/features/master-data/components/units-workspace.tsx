"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { setUnitActiveAction, setVendorActiveAction } from "../actions";
import type { UnitListItem, VendorListItem } from "../types";
import UnitDialog, { type UnitDialogState } from "./unit-dialog";
import VendorDialog, { type VendorDialogState } from "./vendor-dialog";
import MasterDataCatalogLayout from "./master-data-catalog-layout";
import MasterDataTabs, { MasterDataTabContent } from "./master-data-tabs";
import UnitPagination from "./unit-pagination";
import { filterUnits, type UnitFilters } from "./unit-filters";
import UnitTable from "./unit-table";
import { filterVendors } from "./vendor-filters";
import VendorsWorkspace from "./vendors-workspace";
import {
  getMasterDataListState,
  getMasterDataQuery,
  getMasterDataUrl,
  type MasterDataTab,
} from "./master-data-list-state";

const PAGE_SIZE = 10;

export default function UnitsWorkspace({
  units,
  vendors,
  initialQuery = "",
  canManage,
}: {
  units: UnitListItem[];
  vendors: VendorListItem[];
  initialQuery?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const initialState = useMemo(
    () => getMasterDataListState(initialQuery),
    [initialQuery],
  );
  const [listState, setListState] = useState(initialState);
  const [dialogState, setDialogState] = useState<UnitDialogState | null>(null);
  const [vendorDialogState, setVendorDialogState] =
    useState<VendorDialogState | null>(null);
  const [pendingVendorFocusTarget, setPendingVendorFocusTarget] =
    useState<string | null>(null);
  const [isMutating, startMutation] = useTransition();

  useEffect(() => {
    const targetId = pendingVendorFocusTarget;
    if (!targetId) return;

    let attempts = 0;
    const focusTarget = () => {
      document.getElementById(targetId)?.focus();
      attempts += 1;

      if (attempts >= 20) {
        setPendingVendorFocusTarget(null);
      }
    };
    const intervalId = window.setInterval(() => {
      focusTarget();
    }, 100);
    const timeoutId = window.setTimeout(focusTarget, 0);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [pendingVendorFocusTarget]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setListState(initialState);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialState]);

  const search = listState.search;
  const filters: UnitFilters = { search };
  const filteredUnits = useMemo(
    () => filterUnits(units, { search }),
    [search, units],
  );
  const filteredVendors = useMemo(
    () => filterVendors(vendors, { search }),
    [search, vendors],
  );
  const unitPageCount = Math.max(
    1,
    Math.ceil(filteredUnits.length / PAGE_SIZE),
  );
  const vendorPageCount = Math.max(
    1,
    Math.ceil(filteredVendors.length / PAGE_SIZE),
  );
  const unitCurrentPage = Math.min(listState.page, unitPageCount);
  const vendorCurrentPage = Math.min(listState.page, vendorPageCount);
  const currentPage =
    listState.tab === "vendors" ? vendorCurrentPage : unitCurrentPage;
  const firstItemIndex = (unitCurrentPage - 1) * PAGE_SIZE;
  const firstVendorItemIndex = (vendorCurrentPage - 1) * PAGE_SIZE;
  const paginatedUnits = useMemo(
    () => filteredUnits.slice(firstItemIndex, firstItemIndex + PAGE_SIZE),
    [filteredUnits, firstItemIndex],
  );
  const paginatedVendors = useMemo(
    () =>
      filteredVendors.slice(
        firstVendorItemIndex,
        firstVendorItemIndex + PAGE_SIZE,
      ),
    [filteredVendors, firstVendorItemIndex],
  );
  const resultStart =
    paginatedUnits.length === 0 ? 0 : firstItemIndex + 1;
  const resultEnd = firstItemIndex + paginatedUnits.length;
  const currentQuery = getMasterDataQuery(initialQuery, {
    tab: listState.tab,
    search,
    page: currentPage,
  });

  function updateSearch(nextSearch: string) {
    setListState((current) => ({ ...current, search: nextSearch, page: 1 }));
    router.replace(
      getMasterDataUrl(pathname, currentQuery, {
        tab: listState.tab,
        search: nextSearch,
        page: 1,
      }),
      { scroll: false },
    );
  }

  function clearFilters() {
    updateSearch("");
  }

  function openCreateDialog() {
    setDialogState({ mode: "create" });
  }

  function openEditDialog(unit: UnitListItem) {
    setDialogState({ mode: "edit", unit });
  }

  function openCreateVendorDialog() {
    setVendorDialogState({ mode: "create" });
  }

  function openEditVendorDialog(vendor: VendorListItem) {
    setVendorDialogState({ mode: "edit", vendor });
  }

  function closeDialog() {
    const closedDialog = dialogState;
    setDialogState(null);

    window.setTimeout(() => {
      const targetId =
        closedDialog?.mode === "edit"
          ? `unit-actions-${closedDialog.unit.id}`
          : "new-unit";
      document.getElementById(targetId)?.focus();
    }, 0);
  }

  function closeVendorDialog() {
    const closedDialog = vendorDialogState;
    setVendorDialogState(null);

    window.setTimeout(() => {
      const targetId =
        closedDialog?.mode === "edit"
          ? `vendor-actions-${closedDialog.vendor.id}`
          : "new-vendor";
      document.getElementById(targetId)?.focus();
    }, 0);
  }

  function handleToggle(unit: UnitListItem) {
    startMutation(async () => {
      try {
        const result = await setUnitActiveAction(unit.id, !unit.active);

        if (result.status === "error") {
          toast.error(result.error);
          return;
        }

        router.refresh();
        toast.success(
          `Unit “${unit.name}” ${result.unit.active ? "activated" : "deactivated"}`,
        );
        window.setTimeout(() => {
          document.getElementById(`unit-actions-${unit.id}`)?.focus();
        }, 0);
      } catch {
        toast.error(
          "The Unit status could not be changed. Check your connection and try again.",
        );
      }
    });
  }

  function handleDeleted(unit: UnitListItem) {
    const deletedIndex = paginatedUnits.findIndex(
      (currentUnit) => currentUnit.id === unit.id,
    );
    const nextFocusTarget =
      paginatedUnits[deletedIndex + 1] ?? paginatedUnits[deletedIndex - 1];
    const remainingUnitCount = Math.max(filteredUnits.length - 1, 0);
    const nextPageCount = Math.max(
      1,
      Math.ceil(remainingUnitCount / PAGE_SIZE),
    );
    const nextPage = Math.min(currentPage, nextPageCount);

    setListState((current) => ({ ...current, page: nextPage }));
    router.replace(
      getMasterDataUrl(pathname, currentQuery, {
        tab: "units",
        page: nextPage,
      }),
      { scroll: false },
    );

    router.refresh();
    toast.success(`Unit “${unit.name}” deleted`);

    window.setTimeout(() => {
      const targetId = nextFocusTarget
        ? `unit-actions-${nextFocusTarget.id}`
        : "new-unit";
      document.getElementById(targetId)?.focus();
    }, 0);
  }

  function handleVendorToggle(vendor: VendorListItem) {
    startMutation(async () => {
      try {
        const result = await setVendorActiveAction(vendor.id, !vendor.isActive);

        if (result.status === "error") {
          toast.error(result.error);
          return;
        }

        setPendingVendorFocusTarget(`vendor-actions-${vendor.id}`);
        router.refresh();
        toast.success(
          `Vendor “${vendor.name}” ${result.vendor.isActive ? "activated" : "deactivated"}`,
        );
      } catch {
        toast.error(
          "The Vendor status could not be changed. Check your connection and try again.",
        );
      }
    });
  }

  function handleVendorDeleted(vendor: VendorListItem) {
    const deletedIndex = paginatedVendors.findIndex(
      (currentVendor) => currentVendor.id === vendor.id,
    );
    const nextFocusTarget =
      paginatedVendors[deletedIndex + 1] ?? paginatedVendors[deletedIndex - 1];
    const remainingVendorCount = Math.max(filteredVendors.length - 1, 0);
    const nextPageCount = Math.max(
      1,
      Math.ceil(remainingVendorCount / PAGE_SIZE),
    );
    const nextPage = Math.min(currentPage, nextPageCount);
    const nextFocusTargetId = nextFocusTarget
      ? `vendor-actions-${nextFocusTarget.id}`
      : "new-vendor";

    setListState((current) => ({ ...current, page: nextPage }));
    setPendingVendorFocusTarget(nextFocusTargetId);
    router.replace(
      getMasterDataUrl(pathname, currentQuery, {
        tab: "vendors",
        page: nextPage,
      }),
      { scroll: false },
    );

    router.refresh();
    toast.success(`Vendor “${vendor.name}” deleted`);
  }

  function changePage(nextPage: number) {
    const pageCount =
      listState.tab === "vendors" ? vendorPageCount : unitPageCount;
    const page = Math.min(Math.max(nextPage, 1), pageCount);
    setListState((current) => ({ ...current, page }));
    router.replace(
      getMasterDataUrl(pathname, currentQuery, {
        tab: listState.tab,
        page,
      }),
      { scroll: false },
    );
  }

  function changeTab(value: MasterDataTab) {
    if (value !== "units" && value !== "vendors") return;

    setListState((current) => ({ ...current, tab: value }));
    router.replace(
      getMasterDataUrl(pathname, currentQuery, { tab: value }),
      { scroll: false },
    );
  }

  return (
    <div
      className="flex flex-col gap-0"
      data-client-ready={isHydrated ? "true" : undefined}
    >
      <MasterDataTabs activeTab={listState.tab} onTabChange={changeTab}>
        <MasterDataTabContent value="units">
          <MasterDataCatalogLayout
            resourceKey="unit"
            resourceLabels={{ singular: "Unit", plural: "Units" }}
            search={filters.search}
            onSearchChange={updateSearch}
            canCreate={canManage}
            onCreate={openCreateDialog}
          >
            <UnitTable
              units={paginatedUnits}
              filters={filters}
              onClearFilters={clearFilters}
              canManage={canManage}
              onNew={openCreateDialog}
              onEdit={openEditDialog}
              onToggle={handleToggle}
              onDeleted={handleDeleted}
              actionDisabled={isMutating}
            />
            <UnitPagination
              page={unitCurrentPage}
              pageCount={unitPageCount}
              start={resultStart}
              end={resultEnd}
              total={filteredUnits.length}
              onPageChange={changePage}
            />
          </MasterDataCatalogLayout>
        </MasterDataTabContent>
        <MasterDataTabContent value="vendors">
          <VendorsWorkspace
            vendors={paginatedVendors}
            total={filteredVendors.length}
            search={search}
            page={vendorCurrentPage}
            pageCount={vendorPageCount}
            start={
              paginatedVendors.length === 0 ? 0 : firstVendorItemIndex + 1
            }
            end={firstVendorItemIndex + paginatedVendors.length}
            onSearchChange={updateSearch}
            onClearFilters={clearFilters}
            onPageChange={changePage}
            canManage={canManage}
            onNew={openCreateVendorDialog}
            onEdit={openEditVendorDialog}
            onToggle={handleVendorToggle}
            onDeleted={handleVendorDeleted}
            actionDisabled={isMutating}
          />
        </MasterDataTabContent>
      </MasterDataTabs>
      <UnitDialog
        dialogState={dialogState}
        onClose={closeDialog}
        onSuccess={(unit) => {
          const mode = dialogState?.mode;
          closeDialog();
          router.refresh();
          toast.success(
            mode === "edit"
              ? `Unit “${unit.name}” updated`
              : `Unit “${unit.name}” created`,
          );
        }}
      />
      <VendorDialog
        dialogState={vendorDialogState}
        onClose={closeVendorDialog}
        onSuccess={(vendor) => {
          const mode = vendorDialogState?.mode;
          closeVendorDialog();
          router.refresh();
          toast.success(
            mode === "edit"
              ? `Vendor “${vendor.name}” updated`
              : `Vendor “${vendor.name}” added`,
          );
        }}
      />
    </div>
  );
}
