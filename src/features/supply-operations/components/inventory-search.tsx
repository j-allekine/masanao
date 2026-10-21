"use client";

import type { ReactNode } from "react";
import { WorkspaceCatalogToolbar } from "@/components/workspace/catalog-controls";

export default function InventorySearch({
  search,
  onSearchChange,
  filterContent,
  activeFilterCount,
  onClearFilters,
}: {
  search: string;
  onSearchChange: (search: string) => void;
  filterContent: ReactNode;
  activeFilterCount: number;
  onClearFilters: () => void;
}) {
  return (
    <WorkspaceCatalogToolbar
      ariaLabel="Inventory search"
      searchId="inventory-name-search"
      searchLabel="Search Inventory by Item name"
      searchPlaceholder="Search Items by name..."
      search={search}
      onSearchChange={onSearchChange}
      filterContent={filterContent}
      activeFilterCount={activeFilterCount}
      onClearFilters={onClearFilters}
    />
  );
}
