"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { UnitListItem } from "../types";
import { hasUnitFilters, type UnitFilters } from "./unit-filters";
import UnitActionsMenu from "./unit-actions-menu";
import DeleteUnitDialog from "./delete-unit-dialog";
import MasterDataEmptyState from "./master-data-empty-state";
import MasterDataTableFrame from "./master-data-table-frame";

function UnitRow({
  unit,
  onEdit,
  onToggle,
  onDeleted,
  actionDisabled,
  canManage,
}: {
  unit: UnitListItem;
  onEdit: () => void;
  onToggle: () => void;
  onDeleted: () => void;
  actionDisabled: boolean;
  canManage: boolean;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <TableRow className="hover:bg-muted/35">
        <TableCell className="max-w-[28rem]">
          <span className="block truncate">{unit.name}</span>
        </TableCell>
        <TableCell className="font-mono text-mono tracking-mono text-primary">
          {unit.abbreviation}
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={unit.active ? "default" : "outline"}>
            {unit.active ? "Active" : "Inactive"}
          </Badge>
        </TableCell>
        {canManage ? (
          <TableCell className="text-center">
            <UnitActionsMenu
              unitName={unit.name}
              active={unit.active}
              actionButtonId={`unit-actions-${unit.id}`}
              disabled={actionDisabled}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={() => setIsDeleteDialogOpen(true)}
            />
          </TableCell>
        ) : null}
      </TableRow>
      <DeleteUnitDialog
        key={`${unit.id}-${isDeleteDialogOpen ? "open" : "closed"}`}
        unit={unit}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={onDeleted}
      />
    </>
  );
}

export default function UnitTable({
  units,
  filters,
  onClearFilters,
  canManage,
  onNew,
  onEdit,
  onToggle,
  onDeleted,
  actionDisabled,
}: {
  units: UnitListItem[];
  filters: UnitFilters;
  onClearFilters: () => void;
  canManage: boolean;
  onNew: () => void;
  onEdit: (unit: UnitListItem) => void;
  onToggle: (unit: UnitListItem) => void;
  onDeleted: (unit: UnitListItem) => void;
  actionDisabled: boolean;
}) {
  const hasFilters = hasUnitFilters(filters);

  if (units.length === 0) {
    return (
      <MasterDataEmptyState
        icon={<span aria-hidden="true">U</span>}
        hasFilters={hasFilters}
        filteredState={{
          title: "No Units match your search.",
          description: "Clear the search to see the complete Unit catalog.",
        }}
        emptyState={{
          title: "No Units yet.",
          description:
            "An administrator can add the first Unit to begin the catalog.",
        }}
        canCreate={canManage}
        createLabel="Create Unit"
        onCreate={onNew}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <MasterDataTableFrame caption="Units" className="min-w-[36rem]">
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col" className="text-left">
            Name
          </TableHead>
          <TableHead scope="col" className="text-left">
            Abbreviation
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
        {units.map((unit) => (
          <UnitRow
            key={unit.id}
            unit={unit}
            onEdit={() => onEdit(unit)}
            onToggle={() => onToggle(unit)}
              onDeleted={() => onDeleted(unit)}
              actionDisabled={actionDisabled}
              canManage={canManage}
            />
        ))}
      </TableBody>
    </MasterDataTableFrame>
  );
}
