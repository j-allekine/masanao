"use client";

import { cn } from "@/lib/utils";
import { Download, PackageOpen, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ListEmptyState from "@/components/workspace/list-empty-state";
import { WorkspaceContent, WorkspaceCatalogHeader } from "@/components/workspace/workspace-content";
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
  return <Badge variant="outline" className={cn(tone, "h-auto min-h-5 max-w-full whitespace-normal text-center")}>{stockStatusLabels[item.stockStatus]}</Badge>;
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
  return <WorkspaceTableFrame caption="Inventory" responsive>
    <TableHeader className="bg-muted/60"><TableRow>
      <TableHead scope="col" className="w-[24%]">Item</TableHead>
      <TableHead scope="col" className="w-[18%]">Category</TableHead>
      <TableHead scope="col" className="w-[16%] text-right">On hand</TableHead>
      <TableHead scope="col" className="w-[14%]">Base Unit</TableHead>
      <TableHead scope="col" className="w-[14%] text-right">Reorder level</TableHead>
      <TableHead scope="col" className="w-[14%]">Stock status</TableHead>
    </TableRow></TableHeader>
    <TableBody>{items.map((item) => <TableRow key={item.id} data-item-id={item.id}>
      <TableCell data-primary data-label="Item" className="font-medium">{item.name}</TableCell>
      <TableCell data-label="Category">{item.category.name}</TableCell>
      <TableCell data-label="On hand" className="text-right tabular-nums">{onHand(item)}</TableCell>
      <TableCell data-label="Base Unit">{item.baseUnit.name} ({item.baseUnit.abbreviation})</TableCell>
      <TableCell data-label="Reorder level" className="text-right tabular-nums">{item.reorderLevel} {item.baseUnit.abbreviation}</TableCell>
      <TableCell data-label="Stock status"><div className="min-w-0"><StockBadge item={item} />{item.balance.kind === "invalid" ? <p className="mt-2 text-body-sm text-destructive">{item.balance.error}</p> : item.stockStatus === "review-required" ? <p className="mt-2 text-body-sm text-destructive">Invalid Reorder level. Review Item settings.</p> : null}</div></TableCell>
    </TableRow>)}</TableBody>
  </WorkspaceTableFrame>;
}

export default function InventoryContent({ items }: { items: InventoryListItem[] }) {
  const { currentQuery, state, pagination, hasFilters, refreshing, hydrated, navigate, requestRefresh } = useInventoryNavigation(items);

  function clearFilters() { navigate({ search: "", categoryId: "", stockStatus: "", page: 1 }); }

  return <div className="flex min-h-svh flex-col bg-card" data-inventory-ready={hydrated ? "true" : "false"}>
    <WorkspaceHeader title="Supply Operations" />
    <WorkspaceContent>
    <FieldSet disabled={!hydrated} className="flex min-w-0 flex-col gap-6">
      <FieldLegend className="sr-only">Inventory controls and results</FieldLegend>
      <WorkspaceCatalogHeader title="Inventory" description="Available stock in each Item’s Base Unit. Reorder levels flag supplies needing replenishment." action={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-auto min-h-10 whitespace-normal" disabled={refreshing} aria-busy={refreshing} onClick={requestRefresh}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />{refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button variant="outline" className="h-auto min-h-10 whitespace-normal" disabled={!hydrated} nativeButton={false} render={<a href={`/inventory/export${currentQuery ? `?${currentQuery}` : ""}`} download />}>
            <Download data-icon="inline-start" aria-hidden="true" />Export CSV
          </Button>
        </div>
      } />
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
    </WorkspaceContent>
  </div>;
}

