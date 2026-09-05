"use client";

import { Badge } from "@/components/ui/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { VendorListItem } from "../types";
import { hasVendorFilters, type VendorFilters } from "./vendor-filters";
import MasterDataEmptyState from "./master-data-empty-state";
import MasterDataTableFrame from "./master-data-table-frame";

function VendorContactContext({ vendor }: { vendor: VendorListItem }) {
  const context = [vendor.contactNumber, vendor.email, vendor.address].filter(
    (value): value is string => Boolean(value),
  );

  if (context.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex max-w-[28rem] flex-col gap-1 whitespace-normal">
      {context.map((value) => (
        <span key={value} className="break-words">
          {value}
        </span>
      ))}
    </div>
  );
}

export default function VendorTable({
  vendors,
  filters,
  onClearFilters,
}: {
  vendors: VendorListItem[];
  filters: VendorFilters;
  onClearFilters: () => void;
}) {
  const hasFilters = hasVendorFilters(filters);

  if (vendors.length === 0) {
    return (
      <MasterDataEmptyState
        icon={<span aria-hidden="true">V</span>}
        hasFilters={hasFilters}
        filteredState={{
          title: "No Vendors match your search.",
          description: "Clear the search to see the complete Vendor catalog.",
        }}
        emptyState={{
          title: "No Vendors yet.",
          description:
            "An administrator can add the first Vendor to begin the catalog.",
        }}
        canCreate={false}
        createLabel="Create Vendor"
        onCreate={() => undefined}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <MasterDataTableFrame caption="Vendors" className="min-w-[52rem]">
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col" className="text-left">
            Name
          </TableHead>
          <TableHead scope="col" className="text-left">
            Contact person
          </TableHead>
          <TableHead scope="col" className="text-left">
            Contact
          </TableHead>
          <TableHead scope="col" className="text-center">
            Status
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vendors.map((vendor) => (
          <TableRow key={vendor.id} className="hover:bg-muted/35">
            <TableCell className="max-w-[20rem]">
              <span className="block truncate">{vendor.name}</span>
            </TableCell>
            <TableCell className="max-w-[16rem]">
              <span className="block truncate">
                {vendor.contactPerson ?? "—"}
              </span>
            </TableCell>
            <TableCell>
              <VendorContactContext vendor={vendor} />
            </TableCell>
            <TableCell className="text-center">
              <Badge variant={vendor.isActive ? "default" : "outline"}>
                {vendor.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </MasterDataTableFrame>
  );
}
