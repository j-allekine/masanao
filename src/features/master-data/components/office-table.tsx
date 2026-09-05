"use client";

import { Badge } from "@/components/ui/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { OfficeListItem } from "../types";
import { hasOfficeFilters, type OfficeFilters } from "./office-filters";
import MasterDataEmptyState from "./master-data-empty-state";
import MasterDataTableFrame from "./master-data-table-frame";

function OfficeHeadContext({ office }: { office: OfficeListItem }) {
  if (!office.headName && !office.headDesignation) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex max-w-[18rem] flex-col gap-1 whitespace-normal">
      {office.headName ? (
        <span className="break-words">{office.headName}</span>
      ) : null}
      {office.headDesignation ? (
        <span className="break-words text-muted-foreground">
          {office.headDesignation}
        </span>
      ) : null}
    </div>
  );
}

function OfficeContactContext({ office }: { office: OfficeListItem }) {
  if (!office.officialEmail && !office.contactNumber) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex max-w-[20rem] flex-col gap-1 whitespace-normal">
      {office.officialEmail ? (
        <span className="break-words">{office.officialEmail}</span>
      ) : null}
      {office.contactNumber ? (
        <span className="break-words text-muted-foreground">
          {office.contactNumber}
        </span>
      ) : null}
    </div>
  );
}

export default function OfficeTable({
  offices,
  filters,
  onClearFilters,
}: {
  offices: OfficeListItem[];
  filters: OfficeFilters;
  onClearFilters: () => void;
}) {
  const hasFilters = hasOfficeFilters(filters);

  if (offices.length === 0) {
    return (
      <MasterDataEmptyState
        icon={<span aria-hidden="true">O</span>}
        hasFilters={hasFilters}
        filteredState={{
          title: "No Offices match your search.",
          description: "Clear the search to see the complete Office catalog.",
        }}
        emptyState={{
          title: "No Offices yet.",
          description:
            "Offices will appear here once the municipal directory is configured.",
        }}
        canCreate={false}
        createLabel="Create Office"
        onCreate={() => undefined}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <MasterDataTableFrame caption="Offices" className="min-w-[60rem]">
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col" className="text-left">
            Name
          </TableHead>
          <TableHead scope="col" className="text-left">
            Abbreviation
          </TableHead>
          <TableHead scope="col" className="text-left">
            Head
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
        {offices.map((office) => (
          <TableRow key={office.id} className="hover:bg-muted/35">
            <TableCell className="max-w-[20rem]">
              <span className="block truncate">{office.name}</span>
            </TableCell>
            <TableCell className="font-mono text-mono tracking-mono text-primary">
              {office.abbreviation ?? "—"}
            </TableCell>
            <TableCell>
              <OfficeHeadContext office={office} />
            </TableCell>
            <TableCell>
              <OfficeContactContext office={office} />
            </TableCell>
            <TableCell className="text-center">
              <Badge variant={office.isActive ? "default" : "outline"}>
                {office.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </MasterDataTableFrame>
  );
}
