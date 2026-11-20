"use client";

import Link from "next/link";

import { useRef } from "react";
import { Download, PackageOpen, RefreshCw } from "lucide-react";
import { useItemDisplayUnit } from "./item-display-unit";
import { formatDisplayNumber } from "@/lib/format-display-number";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ListEmptyState from "@/components/workspace/list-empty-state";
import WorkspaceLayout, { WorkspaceTaskHeader } from "@/components/workspace/workspace-layout";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import CatalogPagination from "@/components/workspace/catalog-pagination";
import { Button } from "@/components/ui/button";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import type { InventoryListItem } from "../types";
import { formatInventoryQuantity } from "../domain/inventory-display-unit";
import { stockStatusLabels } from "../domain/inventory";
import InventorySearch from "./inventory-search";
import { inventoryCategories } from "../domain/inventory-category-filter";
import { InventoryCategoryFilter } from "./inventory-category-filter";
import { InventoryStatusFilter } from "./inventory-status-filter";
import InventoryStockOverview from "./inventory-stock-overview";
import { useInventoryNavigation } from "./use-inventory-navigation";
import type { InventoryStatusFilterValue } from "../domain/inventory-list-state";

function StockBadge({ item }: { item: InventoryListItem }) {
  const tone = item.stockStatus === "good"
    ? "border-success/30 bg-success-muted text-success-foreground"
    : item.stockStatus === "reorder-now"
      ? "border-warning/30 bg-warning-muted text-warning-foreground"
      : "border-destructive/30 bg-destructive/10 text-destructive";
  return <Badge variant="outline" className={tone}>{stockStatusLabels[item.stockStatus]}</Badge>;
}

function InventoryQuantities({ item, children }: {
  item: InventoryListItem;
  children: (onHand: React.ReactNode, reorderLevel: React.ReactNode) => React.ReactNode;
}) {
  const { unit, factor, selector } = useItemDisplayUnit(item);
  const balance = item.balance.kind === "valid" ? item.balance.quantity : null;
  const onHand = balance === null ? "Unavailable" : formatInventoryQuantity(balance, factor);
  const reorder = formatInventoryQuantity(item.reorderLevel, factor);
  const exactBalance = balance === null ? "Unavailable" : `${formatDisplayNumber(balance)} ${item.baseUnit.abbreviation}`;
  const exactReorder = `${formatDisplayNumber(item.reorderLevel)} ${item.baseUnit.abbreviation}`;

  return children(
    <span className="inline-flex max-w-full flex-wrap items-center justify-end gap-x-1 sm:justify-start">
      <span title={exactBalance} className="min-w-0 wrap-anywhere">{onHand}{balance !== null && (selector ? " " : ` ${unit.abbreviation}`)}</span>
      {selector}
    </span>,
    <span title={exactReorder} className="wrap-anywhere">{reorder === "Unavailable" ? reorder : `${reorder} ${unit.abbreviation}`}</span>,
  );
}

export function InventoryTable({ items, hasFilters = false, onClearFilters }: { items: InventoryListItem[]; hasFilters?: boolean; onClearFilters?: () => void }) {
  if (!items.length) {
    const emptyState = { title: "No active Items.", description: "Active Items in the supply catalog will appear here, including Items with no stock." };
    const filteredState = { title: "No matching Items.", description: "Try changing or clearing the filters.", action: onClearFilters ? { label: "Clear filters", onClick: onClearFilters } : undefined };
    return <ListEmptyState icon={<PackageOpen aria-hidden="true" />} hasFilters={hasFilters} filteredState={filteredState} emptyState={emptyState} />;
  }
  return <>
    <div className="flex flex-col gap-3 sm:hidden" data-inventory-mobile>
      {items.map((item) => <InventoryQuantities key={item.id} item={item}>{(onHand, reorderLevel) => <Card size="sm" data-item-id={item.id}>
        <CardHeader><CardTitle className="min-w-0 break-words">{item.name}</CardTitle></CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-3">
          <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
            <dt className="text-muted-foreground">Category</dt><dd className="break-words text-right">{item.category.name}</dd>
            <dt className="text-muted-foreground">On hand</dt><dd className="break-words text-right tabular-nums">{onHand}</dd>
            <dt className="text-muted-foreground">Reorder level</dt><dd className="break-words text-right tabular-nums">{reorderLevel}</dd>
            <dt className="text-muted-foreground">Stock status</dt><dd className="text-right"><StockBadge item={item} /></dd>
          </dl>
          {item.balance.kind === "invalid" ? <p className="break-words text-body-sm text-destructive">{item.balance.error}</p> : item.stockStatus === "review-required" ? <p className="text-body-sm text-destructive">Invalid Reorder level. Review Item settings.</p> : null}
        </CardContent>
      </Card>}</InventoryQuantities>)}
    </div>
    <div className="hidden sm:block" data-inventory-desktop>
      <WorkspaceTableFrame caption="Inventory" stickyColumns className="min-w-[46rem] table-fixed">
        <TableHeader className="bg-muted/60"><TableRow>{["Item", "Category", "On hand", "Reorder level", "Stock status"].map((label) => <TableHead key={label} scope="col" className="whitespace-normal">{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{items.map((item) => <InventoryQuantities key={item.id} item={item}>{(onHand, reorderLevel) => <TableRow data-item-id={item.id}>
          <TableCell className="whitespace-normal break-words align-top">{item.name}</TableCell>
          <TableCell className="whitespace-normal break-words align-top">{item.category.name}</TableCell>
          <TableCell className="whitespace-normal break-words align-top tabular-nums">{onHand}</TableCell>
          <TableCell className="whitespace-normal break-words align-top tabular-nums">{reorderLevel}</TableCell>
          <TableCell className="whitespace-normal break-words align-top"><StockBadge item={item} />{item.balance.kind === "invalid" ? <p className="mt-2 text-body-sm text-destructive">{item.balance.error}</p> : item.stockStatus === "review-required" ? <p className="mt-2 text-body-sm text-destructive">Invalid Reorder level. Review Item settings.</p> : null}</TableCell>
        </TableRow>}</InventoryQuantities>)}</TableBody>
      </WorkspaceTableFrame>
    </div>
  </>;
}

export default function InventoryContent({ items }: { items: InventoryListItem[] }) {
  const { currentQuery, state, snapshotItems, pagination, hasFilters, refreshing, hydrated, navigate, requestRefresh } = useInventoryNavigation(items);
  const resultsNote = useRef<HTMLParagraphElement>(null);

  function clearFilters() { navigate({ search: "", categoryId: "", stockStatus: "", page: 1 }); }

  function showStockStatus(stockStatus: InventoryStatusFilterValue) {
    navigate({ search: "", categoryId: "", stockStatus, page: 1 });
    requestAnimationFrame(() => {
      resultsNote.current?.focus({ preventScroll: true });
      resultsNote.current?.scrollIntoView({ block: "start" });
    });
  }

  const taskHeader = (
    <WorkspaceTaskHeader actions={<>
      <Button variant="outline" nativeButton={false} render={<Link href="/inventory/opening-stock" />}>Opening Stock</Button>
      <Button type="button" variant="outline" disabled={!hydrated || refreshing} aria-busy={refreshing} onClick={requestRefresh}>
        <RefreshCw data-icon="inline-start" className="hidden sm:inline" aria-hidden="true" />{refreshing ? "Refreshing…" : "Refresh"}
      </Button>
      <Button variant="outline" disabled={!hydrated} nativeButton={false} render={<a href={`/inventory/export${currentQuery ? `?${currentQuery}` : ""}`} download />}>
        <Download data-icon="inline-start" className="hidden sm:inline" aria-hidden="true" />Export CSV
      </Button>
    </>}>
      <h1 className="text-heading-3 font-semibold">Inventory</h1>
    </WorkspaceTaskHeader>
  );

  return <WorkspaceLayout workspaceTitle="Supply Operations" task={taskHeader} data-inventory-ready={hydrated ? "true" : "false"}>
    <FieldSet disabled={!hydrated} className="mx-auto flex w-full min-w-0 max-w-content flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <FieldLegend className="sr-only">Inventory controls and results</FieldLegend>
      <InventoryStockOverview items={snapshotItems} onFilter={showStockStatus} />
      <InventorySearch
        search={state.search}
        onSearchChange={(search) => navigate({ search, page: 1 }, true)}
        activeFilterCount={Number(Boolean(state.categoryId)) + Number(Boolean(state.stockStatus))}
        onClearFilters={clearFilters}
        filterContent={<>
          <InventoryCategoryFilter categories={inventoryCategories(snapshotItems)} value={state.categoryId} onValueChange={(categoryId) => navigate({ categoryId, page: 1 })} />
          <InventoryStatusFilter value={state.stockStatus} onChange={(stockStatus) => navigate({ stockStatus, page: 1 })} />
        </>}
      />
      <div className="flex min-w-0 flex-col gap-3">
        <p ref={resultsNote} tabIndex={-1} className="text-body-sm text-muted-foreground">
          {state.stockStatus && <>Showing items marked “{stockStatusLabels[state.stockStatus]}”. </>}
          Choose a display unit to view On hand and Reorder level in the same unit.
        </p>
        <InventoryTable items={pagination.rows} hasFilters={hasFilters} onClearFilters={clearFilters} />
      </div>
      <CatalogPagination {...pagination} onPageChange={(page) => navigate({ page })} />
    </FieldSet>
  </WorkspaceLayout>;
}

