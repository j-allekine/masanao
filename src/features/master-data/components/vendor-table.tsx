"use client";

import { useState } from "react";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WorkspaceLifecycleBadge from "@/components/workspace/lifecycle-badge";
import WorkspaceTableFrame from "@/components/workspace/table-frame";

import type { VendorListItem } from "../types";
import { hasVendorFilters, type VendorFilters } from "./vendor-filters";
import MasterDataActionsMenu from "./master-data-actions-menu";
import DeleteVendorDialog from "./delete-vendor-dialog";
import ListEmptyState from "@/components/workspace/list-empty-state";

function VendorContactContext({ vendor }: { vendor: VendorListItem }) {
  const context = [vendor.contactNumber, vendor.email, vendor.address].filter(
    (value): value is string => Boolean(value),
  );

  if (context.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-1 whitespace-normal">
      {context.map((value) => (
        <span key={value} className="[overflow-wrap:anywhere]">
          {value}
        </span>
      ))}
    </div>
  );
}

function VendorRow({
  vendor,
  canManage,
  actionDisabled,
  onEdit,
  onToggle,
  onDeleted,
}: {
  vendor: VendorListItem;
  canManage: boolean;
  actionDisabled: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDeleted: () => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <TableRow className="hover:bg-muted/35">
        <TableCell data-primary>
          <span tabIndex={-1} data-master-data-record-id={vendor.id} className="block [overflow-wrap:anywhere]">{vendor.name}</span>
        </TableCell>
        <TableCell data-label="Contact person">
          <span className="block [overflow-wrap:anywhere]">
            {vendor.contactPerson ?? "—"}
          </span>
        </TableCell>
        <TableCell data-label="Contact">
          <VendorContactContext vendor={vendor} />
        </TableCell>
        <TableCell data-label="Status" className="text-center">
          <WorkspaceLifecycleBadge isActive={vendor.isActive} />
        </TableCell>
        {canManage ? (
          <TableCell data-actions className="text-center">
            <MasterDataActionsMenu
              recordName={vendor.name}
              isActive={vendor.isActive}
              actionButtonId={`vendor-actions-${vendor.id}`}
              disabled={actionDisabled}
              onEdit={onEdit}
              onSetActive={() => onToggle()}
              onDelete={() => setIsDeleteDialogOpen(true)}
            />
          </TableCell>
        ) : null}
      </TableRow>
      <DeleteVendorDialog
        key={`${vendor.id}-${isDeleteDialogOpen ? "open" : "closed"}`}
        vendor={vendor}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={onDeleted}
      />
    </>
  );
}

export default function VendorTable({
  vendors,
  filters,
  onClearFilters,
  canManage,
  onEdit,
  onToggle,
  onDeleted,
  actionDisabled,
}: {
  vendors: VendorListItem[];
  filters: VendorFilters;
  onClearFilters: () => void;
  canManage: boolean;
  onEdit: (vendor: VendorListItem) => void;
  onToggle: (vendor: VendorListItem) => void;
  onDeleted: (vendor: VendorListItem) => void;
  actionDisabled: boolean;
}) {
  const hasFilters = hasVendorFilters(filters);

  if (vendors.length === 0) {
    return (
      <ListEmptyState
        icon={<span aria-hidden="true">V</span>}
        hasFilters={hasFilters}
        filteredState={{
          title: "No Vendors match your search.",
          description: "Clear the search to see the complete Vendor catalog.",
          action: {
            label: "Clear search",
            variant: "outline",
            onClick: onClearFilters,
          },
        }}
        emptyState={{
          title: "No Vendors yet.",
          description:
            "An administrator can add the first Vendor to begin the catalog.",
        }}
      />
    );
  }

  return (
    <WorkspaceTableFrame caption="Vendors" responsive>
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
          <TableHead scope="col" className="w-24 text-center">
            Status
          </TableHead>
          {canManage ? (
            <TableHead scope="col" className="w-20 text-center">
              Actions
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {vendors.map((vendor) => (
          <VendorRow
            key={vendor.id}
            vendor={vendor}
            canManage={canManage}
            actionDisabled={actionDisabled}
            onEdit={() => onEdit(vendor)}
            onToggle={() => onToggle(vendor)}
            onDeleted={() => onDeleted(vendor)}
          />
        ))}
      </TableBody>
    </WorkspaceTableFrame>
  );
}
