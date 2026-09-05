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
  createLabel,
  children,
}: {
  resourceKey: string;
  resourceLabels: { singular: string; plural: string };
  search: string;
  onSearchChange: (search: string) => void;
  canCreate: boolean;
  onCreate: () => void;
  createLabel?: string;
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
        createLabel={createLabel}
      />
      <div className="mt-6">{children}</div>
    </>
  );
}
