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

import { setUnitActiveAction } from "../actions";
import type { CategoryListItem, UnitListItem } from "../types";
import CategoriesWorkspace from "./categories-workspace";
import UnitDialog, { type UnitDialogState } from "./unit-dialog";
import MasterDataCatalogLayout from "./master-data-catalog-layout";
import MasterDataTabs, { MasterDataTabContent } from "./master-data-tabs";
import UnitPagination from "./unit-pagination";
import { filterUnits, type UnitFilters } from "./unit-filters";
import UnitTable from "./unit-table";
import {
  getMasterDataListState,
  getMasterDataQuery,
  getMasterDataUrl,
  type MasterDataTab,
} from "./master-data-list-state";

const PAGE_SIZE = 10;

export default function MasterDataWorkspace({
  units,
  categories,
  initialQuery = "",
  canManageUnits,
  canManageCategories,
}: {
  units: UnitListItem[];
  categories: CategoryListItem[];
  initialQuery?: string;
  canManageUnits: boolean;
  canManageCategories: boolean;
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
  const [isUnitMutating, startUnitMutation] = useTransition();

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
  const pageCount = Math.max(1, Math.ceil(filteredUnits.length / PAGE_SIZE));
  const currentPage = Math.min(listState.page, pageCount);
  const firstItemIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedUnits = useMemo(
    () => filteredUnits.slice(firstItemIndex, firstItemIndex + PAGE_SIZE),
    [filteredUnits, firstItemIndex],
  );
  const resultStart = paginatedUnits.length === 0 ? 0 : firstItemIndex + 1;
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
        tab: "units",
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

  function changePage(nextPage: number) {
    const page = Math.min(Math.max(nextPage, 1), pageCount);
    setListState((current) => ({ ...current, page }));
    router.replace(
      getMasterDataUrl(pathname, currentQuery, { tab: "units", page }),
      { scroll: false },
    );
  }

  function changeTab(value: MasterDataTab) {
    setListState((current) => ({ ...current, tab: value }));
    router.replace(
      getMasterDataUrl(pathname, currentQuery, {
        tab: value,
      }),
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
              page={currentPage}
              pageCount={pageCount}
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
    </div>
  );
}
