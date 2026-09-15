"use client";

import { WorkspaceCatalogToolbar } from "@/components/workspace/catalog-controls";

export default function MasterDataCatalogToolbar({
  resourceKey,
  resourceLabels,
  search,
  onSearchChange,
  canCreate,
  onCreate,
  createLabel,
}: {
  resourceKey: string;
  resourceLabels: { singular: string; plural: string };
  search: string;
  onSearchChange: (search: string) => void;
  canCreate: boolean;
  onCreate: () => void;
  createLabel?: string;
}) {
  const searchInputId = `${resourceKey}-search`;
  const createButtonId = `new-${resourceKey}`;

  return (
    <WorkspaceCatalogToolbar
      ariaLabel={`${resourceLabels.singular} search`}
      searchId={searchInputId}
      searchLabel={`Search ${resourceLabels.plural}`}
      searchPlaceholder={`Search ${resourceLabels.plural.toLowerCase()}...`}
      search={search}
      onSearchChange={onSearchChange}
      action={
        canCreate
          ? {
              id: createButtonId,
              label: createLabel ?? `Create ${resourceLabels.singular}`,
              onClick: onCreate,
              className: "sm:min-w-[9rem]",
            }
          : undefined
      }
    />
  );
}
