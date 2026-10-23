"use client";

import { Download, PackageOpen, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ListEmptyState from "@/components/workspace/list-empty-state";
import WorkspaceHeader from "@/components/workspace/workspace-header";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import CatalogPagination from "@/components/workspace/catalog-pagination";
import { Button } from "@/components/ui/button";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import type { InventoryListItem } from "../types";
import { stockStatusLabels } from "../domain/inventory";
import InventorySearch from "./inventory-search";
import { inventoryCategories } from "../domain/inventory-category-filter";
import { InventoryCategoryFilter } from "./inventory-category-filter";
import { InventoryStatusFilter } from "./inventory-status-filter";
import { useInventoryNavigation } from "./use-inventory-navigation";

function StockBadge({ item }: { item: InventoryListItem }) {
  const tone = item.stockStatus === "good"
    ? "border-success/30 bg-success-muted text-success-foreground"
    : item.stockStatus === "reorder-now"
      ? "border-warning/30 bg-warning-muted text-warning-foreground"
      : "border-destructive/30 bg-destructive/10 text-destructive";
  return <Badge variant="outline" className={tone}>{stockStatusLabels[item.stockStatus]}</Badge>;
}

function onHand(item: InventoryListItem) {
  return item.balance.kind === "valid" ? `${item.balance.quantity} ${item.baseUnit.abbreviation}` : "Unavailable";
}

export function InventoryTable({ items, hasFilters = false, onClearFilters }: { items: InventoryListItem[]; hasFilters?: boolean; onClearFilters?: () => void }) {
  if (!items.length) {
    const emptyState = { title: "No active Items.", description: "Active Items in the supply catalog will appear here, including Items with no stock." };
    const filteredState = { title: "No matching Items.", description: "Try changing or clearing the filters.", action: onClearFilters ? { label: "Clear filters", onClick: onClearFilters } : undefined };
    return <ListEmptyState icon={<PackageOpen aria-hidden="true" />} hasFilters={hasFilters} filteredState={filteredState} emptyState={emptyState} />;
  }
  return <>
    <div className="flex flex-col gap-3 sm:hidden" data-inventory-mobile>
      {items.map((item) => <Card key={item.id} size="sm" data-item-id={item.id}>
        <CardHeader><CardTitle className="min-w-0 break-words">{item.name}</CardTitle></CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-3">
          <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
            <dt className="text-muted-foreground">Category</dt><dd className="break-words text-right">{item.category.name}</dd>
            <dt className="text-muted-foreground">On hand</dt><dd className="break-words text-right tabular-nums">{onHand(item)}</dd>
            <dt className="text-muted-foreground">Reorder level</dt><dd className="break-words text-right tabular-nums">{item.reorderLevel} {item.baseUnit.abbreviation}</dd>
            <dt className="text-muted-foreground">Stock status</dt><dd className="text-right"><StockBadge item={item} /></dd>
          </dl>
          {item.balance.kind === "invalid" ? <p className="break-words text-body-sm text-destructive">{item.balance.error}</p> : item.stockStatus === "review-required" ? <p className="text-body-sm text-destructive">Invalid Reorder level. Review Item settings.</p> : null}
        </CardContent>
      </Card>)}
    </div>
    <div className="hidden sm:block" data-inventory-desktop>
      <WorkspaceTableFrame caption="Inventory" className="w-full table-fixed">
        <TableHeader className="bg-muted/60"><TableRow>{["Item", "Category", "On hand", "Reorder level", "Stock status"].map((label) => <TableHead key={label} scope="col" className="whitespace-normal">{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{items.map((item) => <TableRow key={item.id} data-item-id={item.id}>
          <TableCell className="whitespace-normal break-words align-top">{item.name}</TableCell>
          <TableCell className="whitespace-normal break-words align-top">{item.category.name}</TableCell>
          <TableCell className="whitespace-normal break-words align-top tabular-nums">{onHand(item)}</TableCell>
          <TableCell className="whitespace-normal break-words align-top tabular-nums">{item.reorderLevel} {item.baseUnit.abbreviation}</TableCell>
          <TableCell className="whitespace-normal break-words align-top"><StockBadge item={item} />{item.balance.kind === "invalid" ? <p className="mt-2 text-body-sm text-destructive">{item.balance.error}</p> : item.stockStatus === "review-required" ? <p className="mt-2 text-body-sm text-destructive">Invalid Reorder level. Review Item settings.</p> : null}</TableCell>
        </TableRow>)}</TableBody>
      </WorkspaceTableFrame>
    </div>
  </>;
}

export default function InventoryContent({ items }: { items: InventoryListItem[] }) {
  const { currentQuery, state, pagination, hasFilters, refreshing, hydrated, navigate, requestRefresh } = useInventoryNavigation(items);

  function clearFilters() { navigate({ search: "", categoryId: "", stockStatus: "", page: 1 }); }

  return <div className="flex min-h-svh flex-col bg-card" data-inventory-ready={hydrated ? "true" : "false"}>
    <WorkspaceHeader title="Supply Operations" />
    <FieldSet disabled={!hydrated} className="mx-auto flex w-full min-w-0 max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <FieldLegend className="sr-only">Inventory controls and results</FieldLegend>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2"><h1 className="text-heading-1 font-semibold">Inventory</h1><p className="text-body-sm text-muted-foreground">Available stock in each Item’s Base Unit. Reorder levels flag supplies needing replenishment.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={refreshing} aria-busy={refreshing} onClick={requestRefresh}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />{refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button variant="outline" disabled={!hydrated} nativeButton={false} render={<a href={`/inventory/export${currentQuery ? `?${currentQuery}` : ""}`} download />}>
            <Download data-icon="inline-start" aria-hidden="true" />Export CSV
          </Button>
        </div>
      </header>
      <InventorySearch
        search={state.search}
        onSearchChange={(search) => navigate({ search, page: 1 }, true)}
        activeFilterCount={Number(Boolean(state.categoryId)) + Number(Boolean(state.stockStatus))}
        onClearFilters={clearFilters}
        filterContent={<>
          <InventoryCategoryFilter categories={inventoryCategories(items)} value={state.categoryId} onValueChange={(categoryId) => navigate({ categoryId, page: 1 })} />
          <InventoryStatusFilter value={state.stockStatus} onChange={(stockStatus) => navigate({ stockStatus, page: 1 })} />
        </>}
      />
      <InventoryTable items={pagination.rows} hasFilters={hasFilters} onClearFilters={clearFilters} />
      <CatalogPagination {...pagination} onPageChange={(page) => navigate({ page })} />
    </FieldSet>
  </div>;
}

