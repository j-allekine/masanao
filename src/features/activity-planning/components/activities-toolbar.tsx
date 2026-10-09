"use client";

import { WorkspaceCatalogToolbar } from "@/components/workspace/catalog-controls";

export default function ActivitiesToolbar({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (search: string) => void;
}) {
  return (
    <WorkspaceCatalogToolbar
      ariaLabel="Activity search"
      searchId="activity-search"
      searchLabel="Search Activities"
      searchPlaceholder="Search activities..."
      search={search}
      onSearchChange={onSearchChange}
    />
  );
}
