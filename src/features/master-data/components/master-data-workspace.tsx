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
import type {
  CategoryListItem,
  UnitListItem,
  VendorListItem,
} from "../types";
import CategoriesWorkspace from "./categories-workspace";
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

function findVisibleVendorAction(vendorId: string) {
  const actionButtons = document.querySelectorAll<HTMLElement>(
    `[id^="vendor-actions-${vendorId}"]`,
  );
  return Array.from(actionButtons).find(
    (button) => button.getClientRects().length > 0,
  );
}

function focusVisibleVendorAction(vendorId: string) {
  findVisibleVendorAction(vendorId)?.focus();
}

type VendorFocusTarget =
  | { kind: "action"; vendorId: string }
  | "new-vendor";

type CatalogListState = {
  search: string;
  page: number;
};

const emptyCatalogListState: CatalogListState = { search: "", page: 1 };

export default function MasterDataWorkspace({
  units,
  categories,
  vendors,
  initialQuery = "",
  canManageUnits,
  canManageCategories,
  canManageVendors,
}: {
  units: UnitListItem[];
  categories: CategoryListItem[];
  vendors: VendorListItem[];
  initialQuery?: string;
  canManageUnits: boolean;
  canManageCategories: boolean;
  canManageVendors: boolean;
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
  const [activeTab, setActiveTab] = useState(initialState.tab);
  const [unitListState, setUnitListState] = useState<CatalogListState>(() =>
    initialState.tab === "units"
      ? { search: initialState.search, page: initialState.page }
      : emptyCatalogListState,
  );
  const [vendorListState, setVendorListState] = useState<CatalogListState>(() =>
    initialState.tab === "vendors"
      ? { search: initialState.search, page: initialState.page }
      : emptyCatalogListState,
  );
  const [dialogState, setDialogState] = useState<UnitDialogState | null>(null);
  const [vendorDialogState, setVendorDialogState] =
    useState<VendorDialogState | null>(null);
  const [pendingVendorFocusTarget, setPendingVendorFocusTarget] =
    useState<VendorFocusTarget | null>(null);
  const [isUnitMutating, startUnitMutation] = useTransition();
  const [isVendorMutating, startVendorMutation] = useTransition();

  useEffect(() => {
    const targetId = pendingVendorFocusTarget;
    if (!targetId) return;

    let attempts = 0;
    let lastFocusedElement: HTMLElement | null = null;
    const focusTarget = () => {
      const activeElement = document.activeElement;
      if (
        lastFocusedElement?.isConnected &&
        activeElement instanceof HTMLElement &&
        activeElement !== document.body &&
        activeElement !== lastFocusedElement
      ) {
        setPendingVendorFocusTarget(null);
        return;
      }

      const focusElement =
        targetId === "new-vendor"
          ? (() => {
              const button = document.getElementById(targetId);
              if (!button) return null;

              return button;
            })()
          : findVisibleVendorAction(targetId.vendorId);

      if (focusElement) {
        if (activeElement !== focusElement) focusElement.focus();
        lastFocusedElement = focusElement;
      }

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
      setActiveTab(initialState.tab);
      if (initialState.tab === "units") {
        setUnitListState({
          search: initialState.search,
          page: initialState.page,
        });
      } else if (initialState.tab === "vendors") {
        setVendorListState({
          search: initialState.search,
          page: initialState.page,
        });
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialState]);

  const unitSearch = unitListState.search;
  const vendorSearch = vendorListState.search;
  const filters: UnitFilters = { search: unitSearch };
  const filteredUnits = useMemo(
    () => filterUnits(units, { search: unitSearch }),
    [unitSearch, units],
  );
  const filteredVendors = useMemo(
    () => filterVendors(vendors, { search: vendorSearch }),
    [vendorSearch, vendors],
  );
  const unitPageCount = Math.max(
    1,
    Math.ceil(filteredUnits.length / PAGE_SIZE),
  );
  const vendorPageCount = Math.max(
    1,
    Math.ceil(filteredVendors.length / PAGE_SIZE),
  );
  const unitCurrentPage = Math.min(unitListState.page, unitPageCount);
  const vendorCurrentPage = Math.min(vendorListState.page, vendorPageCount);
  const currentPage =
    activeTab === "vendors"
      ? vendorCurrentPage
      : activeTab === "units"
        ? unitCurrentPage
        : 1;
  const currentSearch =
    activeTab === "vendors"
      ? vendorSearch
      : activeTab === "units"
        ? unitSearch
        : "";
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
  const resultStart = paginatedUnits.length === 0 ? 0 : firstItemIndex + 1;
  const resultEnd = firstItemIndex + paginatedUnits.length;
  const currentQuery = getMasterDataQuery(initialQuery, {
    tab: activeTab,
    search: currentSearch,
    page: currentPage,
  });

  function updateSearch(nextSearch: string) {
    if (activeTab === "vendors") {
      setVendorListState({ search: nextSearch, page: 1 });
    } else {
      setUnitListState({ search: nextSearch, page: 1 });
    }
    router.replace(
      getMasterDataUrl(pathname, currentQuery, {
        tab: activeTab,
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
          ? { kind: "action" as const, vendorId: closedDialog.vendor.id }
          : "new-vendor";
      if (targetId === "new-vendor") {
        document.getElementById(targetId)?.focus();
      } else {
        focusVisibleVendorAction(targetId.vendorId);
      }
    }, 0);
  }

  function handleToggle(unit: UnitListItem) {
    startUnitMutation(async () => {
      try {
        const result = await setUnitActiveAction(unit.id, !unit.active);

        if (result.status === "error") {
          toast.error(result.error);
          router.refresh();
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
        router.refresh();
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
    const nextPage = Math.min(unitCurrentPage, nextPageCount);

    setUnitListState((current) => ({ ...current, page: nextPage }));
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
    startVendorMutation(async () => {
      try {
        const result = await setVendorActiveAction(vendor.id, !vendor.isActive);

        if (result.status === "error") {
          toast.error(result.error);
          return;
        }

        setPendingVendorFocusTarget({ kind: "action", vendorId: vendor.id });
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
    const remainingVendors = filteredVendors.filter(
      (currentVendor) => currentVendor.id !== vendor.id,
    );
    const remainingVendorCount = remainingVendors.length;
    const nextPageCount = Math.max(
      1,
      Math.ceil(remainingVendorCount / PAGE_SIZE),
    );
    const nextPage = Math.min(vendorCurrentPage, nextPageCount);
    const deletedGlobalIndex =
      firstVendorItemIndex + Math.max(deletedIndex, 0);
    const nextFocusTarget =
      remainingVendors[
        Math.min(deletedGlobalIndex, remainingVendorCount - 1)
      ];
    const nextFocusTargetId = nextFocusTarget
      ? { kind: "action" as const, vendorId: nextFocusTarget.id }
      : "new-vendor";

    setVendorListState((current) => ({ ...current, page: nextPage }));
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
      activeTab === "vendors" ? vendorPageCount : unitPageCount;
    const page = Math.min(Math.max(nextPage, 1), pageCount);
    if (activeTab === "vendors") {
      setVendorListState((current) => ({ ...current, page }));
    } else {
      setUnitListState((current) => ({ ...current, page }));
    }
    router.replace(
      getMasterDataUrl(pathname, currentQuery, {
        tab: activeTab,
        page,
      }),
      { scroll: false },
    );
  }

  function changeTab(value: MasterDataTab) {
    const nextListState =
      value === "vendors"
        ? vendorListState
        : value === "units"
          ? unitListState
          : emptyCatalogListState;
    setActiveTab(value);
    router.replace(
      getMasterDataUrl(pathname, currentQuery, {
        tab: value,
        search: nextListState.search,
        page: nextListState.page,
      }),
      { scroll: false },
    );
  }

  return (
    <div
      className="flex flex-col gap-0"
      data-client-ready={isHydrated ? "true" : undefined}
    >
      <MasterDataTabs activeTab={activeTab} onTabChange={changeTab}>
        <MasterDataTabContent value="units">
          <MasterDataCatalogLayout
            resourceKey="unit"
            resourceLabels={{ singular: "Unit", plural: "Units" }}
            search={filters.search}
            onSearchChange={updateSearch}
            canCreate={canManageUnits}
            onCreate={openCreateDialog}
          >
            <UnitTable
              units={paginatedUnits}
              filters={filters}
              onClearFilters={clearFilters}
              canManage={canManageUnits}
              onNew={openCreateDialog}
              onEdit={openEditDialog}
              onToggle={handleToggle}
              onDeleted={handleDeleted}
              actionDisabled={isUnitMutating}
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
        <MasterDataTabContent value="categories">
          <CategoriesWorkspace
            categories={categories}
            canManage={canManageCategories}
          />
        </MasterDataTabContent>
        <MasterDataTabContent value="vendors">
          <VendorsWorkspace
            vendors={paginatedVendors}
            total={filteredVendors.length}
            search={vendorSearch}
            page={vendorCurrentPage}
            pageCount={vendorPageCount}
            start={
              paginatedVendors.length === 0 ? 0 : firstVendorItemIndex + 1
            }
            end={firstVendorItemIndex + paginatedVendors.length}
            onSearchChange={updateSearch}
            onClearFilters={clearFilters}
            onPageChange={changePage}
            canManage={canManageVendors}
            onNew={openCreateVendorDialog}
            onEdit={openEditVendorDialog}
            onToggle={handleVendorToggle}
            onDeleted={handleVendorDeleted}
            actionDisabled={isVendorMutating}
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
