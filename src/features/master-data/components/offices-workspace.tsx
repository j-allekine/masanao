"use client";

import type { OfficeListItem } from "../types";
import MasterDataCatalogLayout from "./master-data-catalog-layout";
import OfficePagination from "./office-pagination";
import OfficeTable from "./office-table";
import { type OfficeFilters } from "./office-filters";

export default function OfficesWorkspace({
  offices,
  total,
  search,
  page,
  pageCount,
  start,
  end,
  onSearchChange,
  onClearFilters,
  onPageChange,
}: {
  offices: OfficeListItem[];
  total: number;
  search: string;
  page: number;
  pageCount: number;
  start: number;
  end: number;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
}) {
  const filters: OfficeFilters = { search };

  return (
    <MasterDataCatalogLayout
      resourceKey="office"
      resourceLabels={{ singular: "Office", plural: "Offices" }}
      search={search}
      onSearchChange={onSearchChange}
      canCreate={false}
      onCreate={() => undefined}
    >
      <OfficeTable
        offices={offices}
        filters={filters}
        onClearFilters={onClearFilters}
      />
      <OfficePagination
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
