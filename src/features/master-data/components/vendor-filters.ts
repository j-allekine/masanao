import type { VendorListItem } from "../types";

export type VendorFilters = {
  search: string;
};

export function filterVendors(
  vendors: VendorListItem[],
  filters: VendorFilters,
) {
  const search = filters.search.trim().toLowerCase();

  return vendors.filter((vendor) => {
    return (
      search === "" ||
      vendor.name.toLowerCase().includes(search) ||
      (vendor.contactPerson?.toLowerCase().includes(search) ?? false)
    );
  });
}

export function hasVendorFilters(filters: VendorFilters) {
  return filters.search.trim() !== "";
}
