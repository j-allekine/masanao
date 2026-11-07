"use client";

import type { ReactNode } from "react";

import { WorkspaceCatalogToolbar } from "@/components/workspace/catalog-controls";

export default function MasterDataCatalogLayout({
  resourceKey,
  resourceLabels,
  search,
  onSearchChange,
  children,
}: {
  resourceKey: string;
  resourceLabels: { singular: string; plural: string };
  search: string;
  onSearchChange: (search: string) => void;
  children: ReactNode;
}) {
  return (
    <>
      <WorkspaceCatalogToolbar
        ariaLabel={`${resourceLabels.singular} search`}
        searchId={`${resourceKey}-search`}
        searchLabel={`Search ${resourceLabels.plural}`}
        searchPlaceholder={`Search ${resourceLabels.plural.toLowerCase()}...`}
        search={search}
        onSearchChange={onSearchChange}
      />
      <div className="mt-6">{children}</div>
    </>
  );
}
