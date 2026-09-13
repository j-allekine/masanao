"use client";

import { WorkspaceCatalogToolbar } from "@/components/workspace/catalog-controls";

export default function ActivitiesToolbar({
  search,
  onSearchChange,
  onCreate,
}: {
  search: string;
  onSearchChange: (search: string) => void;
  onCreate: () => void;
}) {
  return (
    <WorkspaceCatalogToolbar
      ariaLabel="Activity search"
      searchId="activity-search"
      searchLabel="Search Activities"
      searchPlaceholder="Search activities..."
      search={search}
      onSearchChange={onSearchChange}
      action={{
        id: "new-activity",
        label: "Create Activity",
        onClick: onCreate,
        className: "sm:min-w-[12rem]",
      }}
    />
  );
}
