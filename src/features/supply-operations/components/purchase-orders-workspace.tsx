"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { PurchaseOrderListItem } from "../types";
import PurchaseOrderPagination from "./purchase-order-pagination";
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

const PAGE_SIZE = 10;
const SEARCH_NAVIGATION_DELAY_MS = 250;

export default function PurchaseOrdersWorkspace({
  purchaseOrders,
}: {
  purchaseOrders: PurchaseOrderListItem[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const [clientQuery, setClientQuery] = useState(currentQuery);
  const [searchInput, setSearchInput] = useState(
    () => getPurchaseOrderListState(new URLSearchParams(currentQuery)).search,
  );
  const searchNavigationTimeoutRef = useRef<number | null>(null);
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
  const resultStart =
    paginatedPurchaseOrders.length === 0 ? 0 : firstPurchaseOrderIndex + 1;
  const resultEnd = firstPurchaseOrderIndex + paginatedPurchaseOrders.length;
  const filtersAreActive = hasPurchaseOrderListFilters(filters);

  useEffect(() => {
    function handlePopState() {
      const nextQuery = window.location.search.slice(1);
      setClientQuery(nextQuery);
      setSearchInput(
        getPurchaseOrderListState(new URLSearchParams(nextQuery)).search,
      );
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    return () => {
      if (searchNavigationTimeoutRef.current !== null) {
        window.clearTimeout(searchNavigationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (listState.page <= pageCount) return;

    const nextUrl = getPurchaseOrderListUrl(pathname, clientQuery, {
      page: pageCount,
    });
    window.history.replaceState(null, "", nextUrl);
  }, [clientQuery, listState.page, pageCount, pathname]);

  function replaceListUrl(
    updates: Parameters<typeof getPurchaseOrderListQuery>[1],
  ) {
    const nextUrl = getPurchaseOrderListUrl(pathname, clientQuery, updates);
    const nextQuery = nextUrl.split("?", 2)[1] ?? "";

    window.history.replaceState(null, "", nextUrl);
    setClientQuery(nextQuery);
  }

  function updateSearch(search: string) {
    setSearchInput(search);
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
    }

    searchNavigationTimeoutRef.current = window.setTimeout(() => {
      replaceListUrl({ search, page: 1 });
      searchNavigationTimeoutRef.current = null;
    }, SEARCH_NAVIGATION_DELAY_MS);
  }

  function clearSearch() {
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
      searchNavigationTimeoutRef.current = null;
    }
    setSearchInput("");
    replaceListUrl({ search: "", page: 1 });
  }

  function changePage(page: number) {
    if (searchNavigationTimeoutRef.current !== null) {
      window.clearTimeout(searchNavigationTimeoutRef.current);
      searchNavigationTimeoutRef.current = null;
    }
    replaceListUrl({ search: searchInput, page: Math.min(Math.max(page, 1), pageCount) });
  }

  return (
    <main className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3 border-b pb-5">
        <div className="min-w-0">
          <h1 className="text-heading-1 font-semibold">Purchase Orders</h1>
          <p className="text-body text-muted-foreground">
            View the orders under which supplies are expected and received.
          </p>
        </div>
      </div>
      <PurchaseOrderToolbar
        search={searchInput}
        onSearchChange={updateSearch}
      />
      <PurchaseOrdersTable
        purchaseOrders={paginatedPurchaseOrders}
        hasFilters={filtersAreActive}
        onClearFilters={clearSearch}
      />
      <PurchaseOrderPagination
        page={currentPage}
        pageCount={pageCount}
        start={resultStart}
        end={resultEnd}
        total={filteredPurchaseOrders.length}
        onPageChange={changePage}
      />
    </main>
  );
}
