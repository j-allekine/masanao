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

import type { OfficeListItem } from "../types";
import DeleteOfficeDialog from "./delete-office-dialog";
import { hasOfficeFilters, type OfficeFilters } from "./office-filters";
import MasterDataActionsMenu from "./master-data-actions-menu";
import ListEmptyState from "@/components/workspace/list-empty-state";

function OfficeHeadContext({ office }: { office: OfficeListItem }) {
  if (!office.headName && !office.headDesignation) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-1 whitespace-normal">
      {office.headName ? (
        <span className="[overflow-wrap:anywhere]">{office.headName}</span>
      ) : null}
      {office.headDesignation ? (
        <span className="[overflow-wrap:anywhere] text-muted-foreground">
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
    <div className="flex flex-col gap-1 whitespace-normal">
      {office.officialEmail ? (
        <span className="[overflow-wrap:anywhere]">{office.officialEmail}</span>
      ) : null}
      {office.contactNumber ? (
        <span className="[overflow-wrap:anywhere] text-muted-foreground">
          {office.contactNumber}
        </span>
      ) : null}
    </div>
  );
}

function OfficeRow({
  office,
  canManage,
  actionDisabled,
  onEdit,
  onToggle,
  onDeleted,
}: {
  office: OfficeListItem;
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
          <span tabIndex={-1} data-master-data-record-id={office.id} className="block whitespace-normal [overflow-wrap:anywhere]">
            {office.name}
          </span>
        </TableCell>
        <TableCell data-label="Abbreviation" className="font-mono text-mono tracking-mono">
          {office.abbreviation ?? "—"}
        </TableCell>
        <TableCell data-label="Head">
          <OfficeHeadContext office={office} />
        </TableCell>
        <TableCell data-label="Contact">
          <OfficeContactContext office={office} />
        </TableCell>
        <TableCell data-label="Status" className="text-center">
          <WorkspaceLifecycleBadge isActive={office.isActive} />
        </TableCell>
        {canManage ? (
          <TableCell data-actions className="text-center">
            <MasterDataActionsMenu
              recordName={office.name}
              isActive={office.isActive}
              actionButtonId={`office-actions-${office.id}`}
              disabled={actionDisabled}
              onEdit={onEdit}
              onSetActive={() => onToggle()}
              onDelete={() => setIsDeleteDialogOpen(true)}
            />
          </TableCell>
        ) : null}
      </TableRow>
      <DeleteOfficeDialog
        key={`${office.id}-${isDeleteDialogOpen ? "open" : "closed"}`}
        office={office}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={onDeleted}
      />
    </>
  );
}

export default function OfficeTable({
  offices,
  filters,
  onClearFilters,
  canManage,
  onEdit,
  onToggle,
  onDeleted,
  actionDisabled,
}: {
  offices: OfficeListItem[];
  filters: OfficeFilters;
  onClearFilters: () => void;
  canManage: boolean;
  onEdit: (office: OfficeListItem) => void;
  onToggle: (office: OfficeListItem) => void;
  onDeleted: (office: OfficeListItem) => void;
  actionDisabled: boolean;
}) {
  const hasFilters = hasOfficeFilters(filters);

  if (offices.length === 0) {
    return (
      <ListEmptyState
        icon={<span aria-hidden="true">O</span>}
        hasFilters={hasFilters}
        filteredState={{
          title: "No Offices match your search.",
          description: "Clear the search to see the complete Office catalog.",
          action: {
            label: "Clear search",
            variant: "outline",
            onClick: onClearFilters,
          },
        }}
        emptyState={{
          title: "No Offices yet.",
          description:
            "Offices will appear here once the municipal directory is configured.",
        }}
      />
    );
  }

  return (
    <WorkspaceTableFrame caption="Offices" responsive>
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col" className="text-left">
            Name
          </TableHead>
          <TableHead scope="col" className="w-[13%] text-left">
            Abbreviation
          </TableHead>
          <TableHead scope="col" className="text-left">
            Head
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
        {offices.map((office) => (
          <OfficeRow
            key={office.id}
            office={office}
            canManage={canManage}
            actionDisabled={actionDisabled}
            onEdit={() => onEdit(office)}
            onToggle={() => onToggle(office)}
            onDeleted={() => onDeleted(office)}
          />
        ))}
      </TableBody>
    </WorkspaceTableFrame>
  );
}
