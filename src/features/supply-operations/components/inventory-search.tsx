"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceCatalogToolbar } from "@/components/workspace/catalog-controls";

export default function InventorySearch({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (search: string) => void;
}) {
  return (
    <WorkspaceCatalogToolbar
      ariaLabel="Inventory search"
      searchId="inventory-name-search"
      searchLabel="Search Inventory by Item name"
      searchPlaceholder="Search Items by name..."
      search={search}
      onSearchChange={onSearchChange}
      filterContent={search ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => onSearchChange("")}>
          <X data-icon="inline-start" />
          Clear search
        </Button>
      ) : undefined}
    />
  );
}
