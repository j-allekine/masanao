"use client";

import { WorkspaceCatalogToolbar } from "@/components/workspace/catalog-controls";

export default function ActivityDesignToolbar({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (search: string) => void;
}) {
  return (
    <WorkspaceCatalogToolbar
      ariaLabel="Activity Design search"
      searchId="activity-design-search"
      searchLabel="Search Activity Designs"
      searchPlaceholder="Search activity designs..."
      search={search}
      onSearchChange={onSearchChange}
    />
  );
}
