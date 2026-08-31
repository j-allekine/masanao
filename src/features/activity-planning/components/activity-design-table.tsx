"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
  onEdit,
  onDeleted,
}: {
  activityDesign: ActivityDesignListItem;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <TableRow className="hover:bg-muted/35">
        <TableCell className="py-3 font-mono text-xs font-semibold tracking-wide text-primary">
          {activityDesign.activityDesignNo}
        </TableCell>
        <TableCell className="max-w-[28rem] py-3 text-sm font-medium">
          <span className="block truncate">{activityDesign.title}</span>
        </TableCell>
        <TableCell className="py-3 text-sm tabular-nums">
          {activityDesign.fiscalYear}
        </TableCell>
        <TableCell
          className="py-3 text-center text-sm font-semibold tabular-nums"
          aria-label={`${activityDesign.activityCount} ${activityDesign.activityCount === 1 ? "Activity" : "Activities"}`}
        >
          {activityDesign.activityCount}
        </TableCell>
        <TableCell className="py-3 text-right">
          <ActivityDesignActionsMenu
            activityDesignTitle={activityDesign.title}
            actionButtonId={`activity-design-actions-${activityDesign.id}`}
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
}: {
  activityDesigns: ActivityDesignListItem[];
  filters: { search: string; fiscalYear: string };
  onClearFilters: () => void;
  onNew: () => void;
  onEdit: (activityDesign: ActivityDesignListItem) => void;
}) {
  const router = useRouter();
  const hasFilters = hasActivityDesignFilters(filters);

  function handleDeleted(activityDesignId: string) {
    const deletedIndex = activityDesigns.findIndex(
      (activityDesign) => activityDesign.id === activityDesignId,
    );
    const nextFocusTarget =
      activityDesigns[deletedIndex + 1] ?? activityDesigns[deletedIndex - 1];

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
      <Empty className="min-h-72 rounded-lg border">
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
    <div className="overflow-x-auto rounded-lg border bg-card shadow-xs">
      <Table className="min-w-[44rem]">
        <caption className="sr-only">Activity Designs</caption>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead scope="col" className="h-10 text-xs font-semibold">Design No.</TableHead>
            <TableHead scope="col" className="h-10 text-xs font-semibold">Title</TableHead>
            <TableHead scope="col" className="h-10 text-xs font-semibold">Year</TableHead>
            <TableHead scope="col" className="h-10 text-center text-xs font-semibold">Activities</TableHead>
            <TableHead scope="col" className="h-10 text-right text-xs font-semibold">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activityDesigns.map((activityDesign) => (
            <ActivityDesignRow
              key={activityDesign.id}
              activityDesign={activityDesign}
              onEdit={() => onEdit(activityDesign)}
              onDeleted={() => handleDeleted(activityDesign.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
