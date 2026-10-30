"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCreatedRecord } from "@/hooks/use-created-record";
import { useCreatedRecordFocus } from "@/hooks/use-created-record-focus";

import { WorkspaceCatalogHeader } from "@/components/workspace/workspace-content";
import { FieldSet, FieldLegend } from "@/components/ui/field";
import { WorkspacePrimaryAction } from "@/components/workspace/catalog-controls";
import CatalogPagination, {
  getCatalogPageAfterDeletion,
} from "@/components/workspace/catalog-pagination";

import type {
  PurchaseOrderListItem,
  PurchaseOrderVendorOption,
} from "../types";
import PurchaseOrderDialog from "./purchase-order-dialog";
import PurchaseOrderToolbar from "./purchase-order-toolbar";
import {
  filterPurchaseOrders,
  hasPurchaseOrderListFilters,
} from "./purchase-order-filters";
import {
  getPurchaseOrderListQuery,
  getPurchaseOrderListState,
  getPurchaseOrderListUrl,
} from "./purchase-order-list-state";
import PurchaseOrdersTable from "./purchase-orders-table";
import { usePurchaseOrderDeliverySummaries } from "./use-purchase-order-delivery-summaries";

const PAGE_SIZE = 10;
const SEARCH_NAVIGATION_DELAY_MS = 250;

type PurchaseOrderDialogState =
  | { mode: "create" }
  | { mode: "edit"; purchaseOrder: PurchaseOrderListItem };

export default function PurchaseOrdersWorkspace({
  purchaseOrders: serverPurchaseOrders,
  vendors,
  canManagePurchaseOrders,
}: {
  purchaseOrders: PurchaseOrderListItem[];
  vendors: PurchaseOrderVendorOption[];
  canManagePurchaseOrders: boolean;
}) {
  const { records: purchaseOrders, setCreatedRecord } = useCreatedRecord(serverPurchaseOrders);
  const pathname = usePathname();
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const [clientQuery, setClientQuery] = useState(currentQuery);
  const [searchInput, setSearchInput] = useState(
    () => getPurchaseOrderListState(new URLSearchParams(currentQuery)).search,
  );
  const latestQueryRef = useRef(currentQuery);
  const searchNavigationTimeoutRef = useRef<number | null>(null);
  const [purchaseOrderDialogState, setPurchaseOrderDialogState] =
    useState<PurchaseOrderDialogState | null>(null);
  const listState = useMemo(
    () => getPurchaseOrderListState(new URLSearchParams(clientQuery)),
    [clientQuery],
  );
  const filters = useMemo(
    () => ({ search: searchInput }),
    [searchInput],
  );
  const filteredPurchaseOrders = useMemo(
    () => filterPurchaseOrders(purchaseOrders, filters),
    [filters, purchaseOrders],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredPurchaseOrders.length / PAGE_SIZE),
  );
  const currentPage = Math.min(listState.page, pageCount);
  const firstPurchaseOrderIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedPurchaseOrders = filteredPurchaseOrders.slice(
    firstPurchaseOrderIndex,
    firstPurchaseOrderIndex + PAGE_SIZE,
  );
  const visibleAmounts = usePurchaseOrderDeliverySummaries(paginatedPurchaseOrders, serverPurchaseOrders);
  const resultStart =
    paginatedPurchaseOrders.length === 0 ? 0 : firstPurchaseOrderIndex + 1;
  const resultEnd = firstPurchaseOrderIndex + paginatedPurchaseOrders.length;
  const filtersAreActive = hasPurchaseOrderListFilters(filters);
  const focusCreatedRecord = useCreatedRecordFocus(
    paginatedPurchaseOrders,
    (id) => `[data-purchase-order-action-id="${CSS.escape(id)}"]`,
  );

  const replaceListUrl = useCallback((
    updates: Parameters<typeof getPurchaseOrderListQuery>[1],
  ) => {
    const nextUrl = getPurchaseOrderListUrl(
      pathname,
      latestQueryRef.current,
      updates,
    );
    const nextQuery = nextUrl.split("?", 2)[1] ?? "";

    latestQueryRef.current = nextQuery;
    window.history.replaceState(window.history.state, "", nextUrl);
    setClientQuery(nextQuery);
  }, [pathname]);

  function clearPendingSearchUrlSync() {
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
      searchNavigationTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    function handlePopState() {
      clearPendingSearchUrlSync();
      const nextQuery = window.location.search.slice(1);
      latestQueryRef.current = nextQuery;
      setClientQuery(nextQuery);
      setSearchInput(
        getPurchaseOrderListState(new URLSearchParams(nextQuery)).search,
      );
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    return clearPendingSearchUrlSync;
  }, []);

  useEffect(() => {
    if (listState.page <= pageCount) return;

    const timeoutId = window.setTimeout(() => {
      replaceListUrl({ page: pageCount });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [clientQuery, listState.page, pageCount, pathname, replaceListUrl]);

  function updateSearch(search: string) {
    setSearchInput(search);
    clearPendingSearchUrlSync();

    searchNavigationTimeoutRef.current = window.setTimeout(() => {
      replaceListUrl({ search, page: 1 });
      searchNavigationTimeoutRef.current = null;
    }, SEARCH_NAVIGATION_DELAY_MS);
  }

  function clearSearch() {
    clearPendingSearchUrlSync();
    setSearchInput("");
    replaceListUrl({ search: "", page: 1 });
  }

  function changePage(page: number) {
    clearPendingSearchUrlSync();
    replaceListUrl({ search: searchInput, page: Math.min(Math.max(page, 1), pageCount) });
  }

  function closePurchaseOrderDialog() {
    const closedDialog = purchaseOrderDialogState;
    setPurchaseOrderDialogState(null);
    window.setTimeout(() => {
      if (closedDialog?.mode === "edit") {
        const actionButtons = Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-purchase-order-action-id]",
          ),
        ).filter(
          (button) =>
            button.dataset.purchaseOrderActionId ===
            closedDialog.purchaseOrder.id,
        );
        const visibleAction = actionButtons.find(
          (button) => button.offsetWidth > 0 && button.offsetHeight > 0,
        );
        if (visibleAction) {
          visibleAction.focus();
          return;
        }
      }

      document.getElementById("new-purchase-order")?.focus();
    }, 0);
  }

  function handleDeleted(purchaseOrder: PurchaseOrderListItem) {
    const page = getCatalogPageAfterDeletion({
      page: currentPage,
      total: filteredPurchaseOrders.length,
      pageSize: PAGE_SIZE,
    });
    replaceListUrl({ search: searchInput, page });
    router.refresh();
    toast.success(
      `Purchase Order “${purchaseOrder.purchaseOrderNo}” deleted`,
    );
    window.setTimeout(() => {
      document.getElementById("new-purchase-order")?.focus();
    }, 0);
  }

  return (
    <div
      className="flex min-w-0 flex-col gap-6"
      data-can-manage-purchase-orders={
        canManagePurchaseOrders ? "true" : "false"
      }
      data-client-ready={isHydrated ? "true" : undefined}
    >
      <WorkspaceCatalogHeader
        title="Purchase Orders"
        description="View order references and the supplies received under them."
        action={canManagePurchaseOrders ? (
          <WorkspacePrimaryAction
            id="new-purchase-order"
            disabled={!isHydrated}
            className="sm:min-w-[11rem]"
            onClick={() => setPurchaseOrderDialogState({ mode: "create" })}
          >
            Create Purchase Order
          </WorkspacePrimaryAction>
        ) : null}
      />
      <FieldSet disabled={!isHydrated} className="min-w-0">
        <FieldLegend className="sr-only">Purchase Order catalog controls</FieldLegend>
        <PurchaseOrderToolbar
          search={searchInput}
          onSearchChange={updateSearch}
        />
      </FieldSet>
      <PurchaseOrdersTable
        purchaseOrders={visibleAmounts.records}
        amountsUnavailable={visibleAmounts.amountsUnavailable}
        catalogUrl={getPurchaseOrderListUrl("/purchase-orders", "", { search: searchInput, page: currentPage })}
        hasFilters={filtersAreActive}
        onClearFilters={clearSearch}
        canManage={canManagePurchaseOrders}
        actionDisabled={!isHydrated}
        onEdit={(purchaseOrder) =>
          setPurchaseOrderDialogState({ mode: "edit", purchaseOrder })
        }
        onDeleted={handleDeleted}
      />
      <CatalogPagination
        page={currentPage}
        pageCount={pageCount}
        start={resultStart}
        end={resultEnd}
        total={filteredPurchaseOrders.length}
        onPageChange={changePage}
      />
      {canManagePurchaseOrders ? (
        <PurchaseOrderDialog
          open={purchaseOrderDialogState !== null}
          purchaseOrder={
            purchaseOrderDialogState?.mode === "edit"
              ? purchaseOrderDialogState.purchaseOrder
              : undefined
          }
          vendors={vendors}
          onClose={closePurchaseOrderDialog}
          onSuccess={(purchaseOrder) => {
            const mode = purchaseOrderDialogState?.mode;
            let searchCleared = false;
            if (mode === "create") {
              clearPendingSearchUrlSync();
              searchCleared = filterPurchaseOrders([purchaseOrder], filters).length === 0;
              const search = searchCleared ? "" : searchInput;
              setCreatedRecord(purchaseOrder);
              focusCreatedRecord(purchaseOrder.id);
              setSearchInput(search);
              const nextUrl = getPurchaseOrderListUrl(pathname, latestQueryRef.current, { search, page: 1 });
              const nextQuery = nextUrl.split("?", 2)[1] ?? "";
              latestQueryRef.current = nextQuery;
              setClientQuery(nextQuery);
              router.replace(nextUrl, { scroll: false });
            }
            closePurchaseOrderDialog();
            if (mode === "edit") router.refresh();
            toast.success(
              `Purchase Order “${purchaseOrder.purchaseOrderNo}” ${mode === "edit" ? "updated" : "created"}`,
              { description: searchCleared ? "Search cleared to show the new Purchase Order." : undefined },
            );
          }}
        />
      ) : null}
    </div>
  );
}
