"use client";

import type { VendorListItem } from "../types";
import MasterDataCatalogLayout from "./master-data-catalog-layout";
import VendorPagination from "./vendor-pagination";
import { type VendorFilters } from "./vendor-filters";
import VendorTable from "./vendor-table";

export default function VendorsWorkspace({
  vendors,
  total,
  search,
  page,
  pageCount,
  start,
  end,
  onSearchChange,
  onClearFilters,
  onPageChange,
  canManage,
  onNew,
  onEdit,
  onToggle,
  onDeleted,
  actionDisabled,
}: {
  vendors: VendorListItem[];
  total: number;
  search: string;
  page: number;
  pageCount: number;
  start: number;
  end: number;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  canManage: boolean;
  onNew: () => void;
  onEdit: (vendor: VendorListItem) => void;
  onToggle: (vendor: VendorListItem) => void;
  onDeleted: (vendor: VendorListItem) => void;
  actionDisabled: boolean;
}) {
  const filters: VendorFilters = { search };

  return (
    <MasterDataCatalogLayout
      resourceKey="vendor"
      resourceLabels={{ singular: "Vendor", plural: "Vendors" }}
      search={search}
      onSearchChange={onSearchChange}
      canCreate={canManage}
      onCreate={onNew}
      createLabel="Add Vendor"
    >
      <VendorTable
        vendors={vendors}
        filters={filters}
        onClearFilters={onClearFilters}
        canManage={canManage}
        onNew={onNew}
        onEdit={onEdit}
        onToggle={onToggle}
        onDeleted={onDeleted}
        actionDisabled={actionDisabled}
      />
      <VendorPagination
        page={page}
        pageCount={pageCount}
        start={start}
        end={end}
        total={total}
        onPageChange={onPageChange}
      />
    </MasterDataCatalogLayout>
  );
}
