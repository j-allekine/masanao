"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { ActivityDesignListItem } from "../types";
import { hasActivityDesignFilters } from "./activity-design-filters";
import ActivityDesignActionsMenu from "./activity-design-actions-menu";
import DeleteActivityDesignDialog from "./delete-activity-design-dialog";

function ActivityDesignRow({
  activityDesign,
  selected,
  onToggleSelect,
  onEdit,
  onAddActivity,
  onDeleted,
}: {
  activityDesign: ActivityDesignListItem;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onAddActivity: () => void;
  onDeleted: () => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <TableRow
        aria-selected={selected}
        className="h-14 hover:bg-muted/35 aria-selected:bg-primary/5"
      >
        <TableCell className="w-16 px-5 text-center">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select ${activityDesign.title}`}
          />
        </TableCell>
        <TableCell className="py-2 text-mono font-medium tracking-wide text-primary">
          {activityDesign.activityDesignNo}
        </TableCell>
        <TableCell className="max-w-[28rem] py-2 text-table font-medium">
          <span className="block truncate">{activityDesign.title}</span>
        </TableCell>
        <TableCell className="py-2 text-center text-table tabular-nums">
          {activityDesign.fiscalYear}
        </TableCell>
        <TableCell
          className="py-2 text-center text-table"
          aria-label={`${activityDesign.activityCount} ${activityDesign.activityCount === 1 ? "Activity" : "Activities"}`}
        >
          <span className="block tabular-nums">
            {activityDesign.activityCount}
          </span>
          <span className="sr-only">
            {activityDesign.activityCount === 1 ? "Activity" : "Activities"}
          </span>
        </TableCell>
        <TableCell className="py-2 text-center text-table text-muted-foreground tabular-nums">
          <span aria-label="Meal schedule count unavailable">—</span>
        </TableCell>
        <TableCell className="py-3 text-center">
          <ActivityDesignActionsMenu
            activityDesignTitle={activityDesign.title}
            actionButtonId={`activity-design-actions-${activityDesign.id}`}
            onAddActivity={onAddActivity}
            onEdit={onEdit}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />
        </TableCell>
      </TableRow>
      <DeleteActivityDesignDialog
        key={`${activityDesign.id}-${isDeleteDialogOpen ? "open" : "closed"}`}
        activityDesign={activityDesign}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={onDeleted}
      />
    </>
  );
}

export default function ActivityDesignTable({
  activityDesigns,
  filters,
  onClearFilters,
  onNew,
  onEdit,
  onAddActivity,
  selectedIds,
  allCurrentPageSelected,
  someCurrentPageSelected,
  onToggleSelect,
  onToggleSelectAll,
  onDeleted,
}: {
  activityDesigns: ActivityDesignListItem[];
  filters: { search: string; fiscalYear: string };
  onClearFilters: () => void;
  onNew: () => void;
  onEdit: (activityDesign: ActivityDesignListItem) => void;
  onAddActivity: (activityDesign: ActivityDesignListItem) => void;
  selectedIds: ReadonlySet<string>;
  allCurrentPageSelected: boolean;
  someCurrentPageSelected: boolean;
  onToggleSelect: (activityDesignId: string) => void;
  onToggleSelectAll: () => void;
  onDeleted?: (activityDesignId: string) => void;
}) {
  const router = useRouter();
  const hasFilters = hasActivityDesignFilters(filters);

  function handleDeleted(activityDesignId: string) {
    const deletedIndex = activityDesigns.findIndex(
      (activityDesign) => activityDesign.id === activityDesignId,
    );
    const nextFocusTarget =
      activityDesigns[deletedIndex + 1] ?? activityDesigns[deletedIndex - 1];

    onDeleted?.(activityDesignId);
    router.refresh();

    window.setTimeout(() => {
      const targetId = nextFocusTarget
        ? `activity-design-actions-${nextFocusTarget.id}`
        : "new-activity-design";
      document.getElementById(targetId)?.focus();
    }, 0);
  }

  if (activityDesigns.length === 0) {
    return (
      <Empty className="min-h-60 rounded-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <span aria-hidden="true">AD</span>
          </EmptyMedia>
          <EmptyTitle>
            {hasFilters
              ? "No Activity Designs match your current filters."
              : "No Activity Designs yet."}
          </EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? "Clear filters to see the complete Activity Designs list."
              : "Create an Activity Design to begin planning."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {hasFilters ? (
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button type="button" onClick={onNew}>
              New Activity Design
            </Button>
          )}
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
      <Table className="min-w-[68rem]">
        <caption className="sr-only">Activity Designs</caption>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead scope="col" className="h-12 w-16 px-5 text-center">
              <Checkbox
                checked={allCurrentPageSelected}
                indeterminate={someCurrentPageSelected && !allCurrentPageSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label="Select all Activity Designs on this page"
              />
            </TableHead>
            <TableHead scope="col" className="h-12 text-center text-table-head font-semibold tracking-table-head">
              Design No.
            </TableHead>
            <TableHead scope="col" className="h-12 text-center text-table-head font-semibold tracking-table-head">
              Activity Design
            </TableHead>
            <TableHead scope="col" className="h-12 text-center text-table-head font-semibold tracking-table-head">
              Fiscal Year
            </TableHead>
            <TableHead scope="col" className="h-12 text-center text-table-head font-semibold tracking-table-head">
              Activities
            </TableHead>
            <TableHead scope="col" className="h-12 text-center text-table-head font-semibold tracking-table-head">
              Meal Schedules
            </TableHead>
            <TableHead scope="col" className="h-12 text-center text-table-head font-semibold tracking-table-head">
              <span className="inline-flex items-center gap-3">
                Actions
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Configure Activity Designs columns"
                >
                  <Settings2 />
                </Button>
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activityDesigns.map((activityDesign) => (
            <ActivityDesignRow
              key={activityDesign.id}
              activityDesign={activityDesign}
              selected={selectedIds.has(activityDesign.id)}
              onToggleSelect={() => onToggleSelect(activityDesign.id)}
              onEdit={() => onEdit(activityDesign)}
              onAddActivity={() => onAddActivity(activityDesign)}
              onDeleted={() => handleDeleted(activityDesign.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
