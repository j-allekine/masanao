"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { VendorListItem } from "../types";
import { hasVendorFilters, type VendorFilters } from "./vendor-filters";
import VendorActionsMenu from "./vendor-actions-menu";
import DeleteVendorDialog from "./delete-vendor-dialog";
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
        {canManage ? (
          <TableCell className="text-center">
            <VendorActionsMenu
              vendorName={vendor.name}
              isActive={vendor.isActive}
              actionButtonId={`vendor-actions-${vendor.id}`}
              disabled={actionDisabled}
              onEdit={onEdit}
              onToggle={onToggle}
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

function VendorMobileCard({
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
      <Card size="sm">
        <CardHeader className="grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <CardTitle className="break-words">{vendor.name}</CardTitle>
            <p className="break-words text-body-sm text-muted-foreground">
              {vendor.contactPerson ?? "No contact person"}
            </p>
          </div>
          {canManage ? (
            <CardAction>
              <VendorActionsMenu
                vendorName={vendor.name}
                isActive={vendor.isActive}
                actionButtonId={`vendor-actions-${vendor.id}-mobile`}
                disabled={actionDisabled}
                onEdit={onEdit}
                onToggle={onToggle}
                onDelete={() => setIsDeleteDialogOpen(true)}
              />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-label font-semibold text-muted-foreground">
              Status
            </span>
            <Badge variant={vendor.isActive ? "default" : "outline"}>
              {vendor.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label font-semibold text-muted-foreground">
              Contact
            </span>
            <VendorContactContext vendor={vendor} />
          </div>
        </CardContent>
      </Card>
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
  onNew,
  onEdit,
  onToggle,
  onDeleted,
  actionDisabled,
}: {
  vendors: VendorListItem[];
  filters: VendorFilters;
  onClearFilters: () => void;
  canManage: boolean;
  onNew: () => void;
  onEdit: (vendor: VendorListItem) => void;
  onToggle: (vendor: VendorListItem) => void;
  onDeleted: (vendor: VendorListItem) => void;
  actionDisabled: boolean;
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
        canCreate={canManage}
        createLabel="Add Vendor"
        onCreate={onNew}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:hidden">
        {vendors.map((vendor) => (
          <VendorMobileCard
            key={vendor.id}
            vendor={vendor}
            canManage={canManage}
            actionDisabled={actionDisabled}
            onEdit={() => onEdit(vendor)}
            onToggle={() => onToggle(vendor)}
            onDeleted={() => onDeleted(vendor)}
          />
        ))}
      </div>
      <div className="hidden sm:block">
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
              {canManage ? (
                <TableHead scope="col" className="text-center">
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
        </MasterDataTableFrame>
      </div>
    </>
  );
}
