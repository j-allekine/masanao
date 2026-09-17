"use client";

import { WorkspaceCatalogToolbar } from "@/components/workspace/catalog-controls";

export default function PurchaseOrderToolbar({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (search: string) => void;
}) {
  return (
    <WorkspaceCatalogToolbar
      ariaLabel="Purchase Order catalog search"
      searchId="purchase-order-search"
      searchLabel="Search Purchase Orders"
      searchPlaceholder="Search by PO number, Vendor, or reference..."
      search={search}
      onSearchChange={onSearchChange}
    />
  );
}
