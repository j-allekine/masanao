"use client";

import { WorkspaceCatalogToolbar } from "@/components/workspace/catalog-controls";

export default function ActivityDesignToolbar({
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
      ariaLabel="Activity Design search"
      searchId="activity-design-search"
      searchLabel="Search Activity Designs"
      searchPlaceholder="Search activity designs..."
      search={search}
      onSearchChange={onSearchChange}
      action={{
        id: "new-activity-design",
        label: "Create Activity Design",
        onClick: onCreate,
        className: "sm:min-w-[12rem]",
      }}
    />
  );
}
