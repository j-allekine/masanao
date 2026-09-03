"use client";

import type { ReactNode } from "react";

import MasterDataCatalogToolbar from "./master-data-catalog-toolbar";

export default function MasterDataCatalogLayout({
  resourceKey,
  resourceLabels,
  search,
  onSearchChange,
  canCreate,
  onCreate,
  children,
}: {
  resourceKey: string;
  resourceLabels: { singular: string; plural: string };
  search: string;
  onSearchChange: (search: string) => void;
  canCreate: boolean;
  onCreate: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <MasterDataCatalogToolbar
        resourceKey={resourceKey}
        resourceLabels={resourceLabels}
        search={search}
        onSearchChange={onSearchChange}
        canCreate={canCreate}
        onCreate={onCreate}
      />
      <div className="mt-6">{children}</div>
    </>
  );
}
