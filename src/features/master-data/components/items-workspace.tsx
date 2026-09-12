"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { setItemActiveAction } from "../actions";
import type {
  CategoryListItem,
  ItemListItem,
  UnitListItem,
} from "../types";
import ItemCreateDialog from "./item-create-dialog";
import ItemPagination from "./item-pagination";
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

type ItemDialogState =
  | { mode: "create" }
  | { mode: "edit"; item: ItemListItem };

export default function ItemsWorkspace({
  items,
  categories,
  units,
  canManageItems,
}: {
  items: ItemListItem[];
  categories: CategoryListItem[];
  units: UnitListItem[];
  canManageItems: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [itemDialogState, setItemDialogState] =
    useState<ItemDialogState | null>(null);
  const [isMutating, startMutation] = useTransition();
  const currentQuery = searchParams.toString();
  const latestQueryRef = useRef(currentQuery);
  const listState = useMemo(
    () => getItemListState(new URLSearchParams(currentQuery)),
    [currentQuery],
  );
  const filters = useMemo<ItemListFilters>(
    () => ({
      search: listState.search,
      categoryId: listState.categoryId,
      status: listState.status,
    }),
    [listState.categoryId, listState.search, listState.status],
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
    latestQueryRef.current = currentQuery;
  }, [currentQuery]);

  useEffect(() => {
    if (listState.page <= pageCount) return;

    router.replace(getItemListUrl(pathname, currentQuery, { page: pageCount }), {
      scroll: false,
    });
  }, [currentQuery, listState.page, pageCount, pathname, router]);

  function navigateList(
    updates: Parameters<typeof getItemListQuery>[1],
  ) {
    const nextUrl = getItemListUrl(pathname, latestQueryRef.current, updates);
    latestQueryRef.current = nextUrl.split("?", 2)[1] ?? "";
    router.push(nextUrl, {
      scroll: false,
    });
  }

  function updateSearch(search: string) {
    navigateList({ search, page: 1 });
  }

  function updateCategory(categoryId: string) {
    navigateList({ categoryId, page: 1 });
  }

  function updateStatus(status: ItemListStatus) {
    navigateList({ status, page: 1 });
  }

  function clearFilters() {
    navigateList({ search: "", categoryId: "", status: "all", page: 1 });
  }

  function changePage(nextPage: number) {
    navigateList({ page: Math.min(Math.max(nextPage, 1), pageCount) });
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
          <Button
            id="new-item"
            type="button"
            size="sm"
            className="h-9 w-full sm:w-auto sm:min-w-[8rem]"
            onClick={openCreateDialog}
          >
            Add Item
          </Button>
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
        actionDisabled={isMutating}
      />
      <ItemPagination
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
