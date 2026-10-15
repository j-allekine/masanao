"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { WorkspacePrimaryAction } from "@/components/workspace/catalog-controls";
import CatalogPagination from "@/components/workspace/catalog-pagination";

import { setItemActiveAction } from "../actions";
import { sortItemUnitConversions } from "../domain/item-unit-conversion";
import type {
  CategoryListItem,
  ItemListItem,
  ItemUnitConversionListItem,
  UnitListItem,
} from "../types";
import ItemCreateDialog from "./item-create-dialog";
import ItemUnitsSheet from "./item-units-sheet";
import ItemToolbar from "./item-toolbar";
import ItemsTable from "./items-table";
import {
  filterItems,
  hasItemListFilters,
  type ItemListFilters,
} from "./item-filters";
import {
  getItemListQuery,
  getItemListState,
  getItemListUrl,
  type ItemListStatus,
} from "./item-list-state";

const PAGE_SIZE = 10;
const SEARCH_NAVIGATION_DELAY_MS = 250;

type ItemDialogState =
  | { mode: "create" }
  | { mode: "edit"; item: ItemListItem };

type ItemsWorkspaceProps = {
  items: ItemListItem[];
  categories: CategoryListItem[];
  units: UnitListItem[];
  canManageItems: boolean;
};

export default function ItemsWorkspace(props: ItemsWorkspaceProps) {
  const currentQuery = useSearchParams().toString();

  return (
    <ItemsWorkspaceContent
      {...props}
      currentQuery={currentQuery}
    />
  );
}

function ItemsWorkspaceContent({
  items,
  categories,
  units,
  canManageItems,
  currentQuery,
}: ItemsWorkspaceProps & { currentQuery: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [itemDialogState, setItemDialogState] =
    useState<ItemDialogState | null>(null);
  const [unitsItem, setUnitsItem] = useState<ItemListItem | null>(null);
  const [searchInput, setSearchInput] = useState(
    () => getItemListState(new URLSearchParams(currentQuery)).search,
  );
  const [isMutating, startMutation] = useTransition();
  const latestQueryRef = useRef(currentQuery);
  const lastObservedQueryRef = useRef(currentQuery);
  const ownNavigationQueries = useRef(new Set<string>());
  const searchNavigationTimeoutRef = useRef<number | null>(null);
  const listState = useMemo(
    () => getItemListState(new URLSearchParams(currentQuery)),
    [currentQuery],
  );
  const filters = useMemo<ItemListFilters>(
    () => ({
      search: searchInput,
      categoryId: listState.categoryId,
      status: listState.status,
    }),
    [listState.categoryId, listState.status, searchInput],
  );
  const filteredItems = useMemo(
    () => filterItems(items, filters),
    [filters, items],
  );
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(listState.page, pageCount);
  const firstItemIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedItems = useMemo(
    () => filteredItems.slice(firstItemIndex, firstItemIndex + PAGE_SIZE),
    [filteredItems, firstItemIndex],
  );
  const resultStart =
    paginatedItems.length === 0 ? 0 : firstItemIndex + 1;
  const resultEnd = firstItemIndex + paginatedItems.length;
  const filtersAreActive = hasItemListFilters(filters);

  useEffect(() => {
    if (lastObservedQueryRef.current === currentQuery) return;
    const syncSearchInputTimeout = window.setTimeout(() => {
      lastObservedQueryRef.current = currentQuery;
      // A completed URL update may acknowledge an older keystroke. Keep the
      // newer local text instead of replacing it with that stale search value.
      if (ownNavigationQueries.current.delete(currentQuery)) return;
      setSearchInput(getItemListState(new URLSearchParams(currentQuery)).search);
      latestQueryRef.current = currentQuery;
    }, 0);

    return () => window.clearTimeout(syncSearchInputTimeout);
  }, [currentQuery]);

  useEffect(() => {
    function restoreHistorySearch() {
      ownNavigationQueries.current.clear();
      if (searchNavigationTimeoutRef.current !== null) {
        window.clearTimeout(searchNavigationTimeoutRef.current);
        searchNavigationTimeoutRef.current = null;
      }
      latestQueryRef.current = window.location.search.slice(1);
      setSearchInput(getItemListState(new URLSearchParams(latestQueryRef.current)).search);
    }
    window.addEventListener("popstate", restoreHistorySearch);
    return () => {
      window.removeEventListener("popstate", restoreHistorySearch);
      if (searchNavigationTimeoutRef.current !== null) {
        window.clearTimeout(searchNavigationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (listState.page <= pageCount || searchInput !== listState.search) return;

    const nextUrl = getItemListUrl(pathname, currentQuery, { page: pageCount });
    const nextQuery = nextUrl.split("?", 2)[1] ?? "";
    ownNavigationQueries.current.add(nextQuery);
    latestQueryRef.current = nextQuery;
    router.replace(nextUrl, {
      scroll: false,
    });
  }, [currentQuery, listState.page, listState.search, pageCount, pathname, router, searchInput]);

  function navigateList(
    updates: Parameters<typeof getItemListQuery>[1],
    navigation: "push" | "replace" = "push",
  ) {
    const nextUrl = getItemListUrl(pathname, latestQueryRef.current, updates);
    latestQueryRef.current = nextUrl.split("?", 2)[1] ?? "";
    ownNavigationQueries.current.add(latestQueryRef.current);
    router[navigation](nextUrl, {
      scroll: false,
    });
  }

  function updateSearch(search: string) {
    setSearchInput(search);
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
    }
    searchNavigationTimeoutRef.current = window.setTimeout(() => {
      navigateList({ search, page: 1 }, "replace");
      searchNavigationTimeoutRef.current = null;
    }, SEARCH_NAVIGATION_DELAY_MS);
  }

  function updateCategory(categoryId: string) {
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
      searchNavigationTimeoutRef.current = null;
    }
    navigateList({ search: searchInput, categoryId, page: 1 });
  }

  function updateStatus(status: ItemListStatus) {
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
      searchNavigationTimeoutRef.current = null;
    }
    navigateList({ search: searchInput, status, page: 1 });
  }

  function clearFilters() {
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
      searchNavigationTimeoutRef.current = null;
    }
    setSearchInput("");
    navigateList({ search: "", categoryId: "", status: "all", page: 1 });
  }

  function changePage(nextPage: number) {
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
      searchNavigationTimeoutRef.current = null;
    }
    navigateList({
      search: searchInput,
      page: Math.min(Math.max(nextPage, 1), pageCount),
    });
  }

  function openCreateDialog() {
    setItemDialogState({ mode: "create" });
  }

  function openEditDialog(item: ItemListItem) {
    setItemDialogState({ mode: "edit", item });
  }

  function closeCreateDialog() {
    const closedDialog = itemDialogState;
    setItemDialogState(null);
    window.setTimeout(() => {
      if (closedDialog?.mode === "edit") {
        const actionButtons = Array.from(
          document.querySelectorAll<HTMLElement>("[data-item-action-id]"),
        ).filter(
          (button) => button.dataset.itemActionId === closedDialog.item.id,
        );
        const visibleAction = actionButtons.find(
          (button) => button.offsetWidth > 0 && button.offsetHeight > 0,
        );
        visibleAction?.focus();
        return;
      }

      document.getElementById("new-item")?.focus();
    }, 0);
  }

  function handleSetActive(item: ItemListItem, isActive: boolean) {
    startMutation(async () => {
      try {
        const result = await setItemActiveAction(item.id, isActive);

        if (result.status === "error") {
          toast.error(result.error);
          router.refresh();
          return;
        }

        router.refresh();
        toast.success(
          `Item “${item.name}” ${result.item.isActive ? "activated" : "deactivated"}`,
        );
      } catch {
        toast.error(
          "The Item status could not be changed. Check your connection and try again.",
        );
        router.refresh();
      }
    });
  }

  function handleDeleted(item: ItemListItem) {
    router.refresh();
    toast.success(`Item “${item.name}” deleted`);
    window.setTimeout(() => {
      document.getElementById("new-item")?.focus();
    }, 0);
  }

  function handleUnitConversionSaved(conversion: ItemUnitConversionListItem) {
    setUnitsItem((currentItem) => currentItem
      ? {
        ...currentItem,
        unitConversions: sortItemUnitConversions([
          ...(currentItem.unitConversions ?? []),
          conversion,
        ]),
      }
      : null,
    );
    router.refresh();
    toast.success("Alternate Unit added");
  }

  return (
    <main
      className="flex min-w-0 flex-col gap-6"
      data-can-manage-items={canManageItems ? "true" : "false"}
    >
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-heading-1 font-semibold">Items</h1>
          <p className="text-body text-muted-foreground">
            View the ingredients and supplies available to municipal kitchen operations.
          </p>
        </div>
        {canManageItems ? (
          <WorkspacePrimaryAction
            id="new-item"
            className="sm:min-w-[8rem]"
            onClick={openCreateDialog}
          >
            Create Item
          </WorkspacePrimaryAction>
        ) : null}
      </div>
      <ItemToolbar
        filters={filters}
        categories={categories}
        hasFilters={filtersAreActive}
        onSearchChange={updateSearch}
        onCategoryChange={updateCategory}
        onStatusChange={updateStatus}
        onClearFilters={clearFilters}
      />
      <ItemsTable
        items={paginatedItems}
        hasFilters={filtersAreActive}
        onClearFilters={clearFilters}
        canManage={canManageItems}
        onEdit={openEditDialog}
        onSetActive={handleSetActive}
        onDeleted={handleDeleted}
        onUnits={setUnitsItem}
        actionDisabled={isMutating}
      />
      <ItemUnitsSheet
        item={unitsItem}
        units={units}
        canManage={canManageItems}
        open={unitsItem !== null}
        onOpenChange={(open) => { if (!open) setUnitsItem(null); }}
        onSaved={handleUnitConversionSaved}
      />
      <CatalogPagination
        page={currentPage}
        pageCount={pageCount}
        start={resultStart}
        end={resultEnd}
        total={filteredItems.length}
        onPageChange={changePage}
      />
      {canManageItems ? (
        <ItemCreateDialog
          open={itemDialogState !== null}
          item={
            itemDialogState?.mode === "edit"
              ? itemDialogState.item
              : undefined
          }
          categories={categories}
          units={units}
          onClose={closeCreateDialog}
          onSuccess={(item) => {
            const mode = itemDialogState?.mode;
            closeCreateDialog();
            router.refresh();
            toast.success(
              mode === "edit"
                ? `Item “${item.name}” updated`
                : `Item “${item.name}” created`,
            );
          }}
        />
      ) : null}
    </main>
  );
}
