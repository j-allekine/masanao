"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ListEmptyState from "@/components/workspace/list-empty-state";
import WorkspaceTableFrame from "@/components/workspace/table-frame";

import type { ActivityDesignListItem } from "../types";
import { hasActivityDesignFilters } from "./activity-design-filters";
import ActivityDesignActionsMenu from "./activity-design-actions-menu";
import DeleteActivityDesignDialog from "./delete-activity-design-dialog";

const activityCountFormatter = new Intl.NumberFormat("en-US");

function ActivityDesignRow({
  activityDesign,
  onEdit,
  onAddActivity,
  onDeleted,
}: {
  activityDesign: ActivityDesignListItem;
  onEdit: () => void;
  onAddActivity: () => void;
  onDeleted: () => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const formattedActivityCount = activityCountFormatter.format(
    activityDesign.activityCount,
  );

  return (
    <>
      <TableRow className="hover:bg-muted/35">
        <TableCell className="font-mono text-mono tracking-mono text-primary">
          {activityDesign.activityDesignNo}
        </TableCell>
        <TableCell className="max-w-[28rem]">
          <span className="block truncate">{activityDesign.title}</span>
        </TableCell>
        <TableCell className="text-center tabular-nums">
          {activityDesign.fiscalYear}
        </TableCell>
        <TableCell
          className="text-center"
          aria-label={`${formattedActivityCount} ${activityDesign.activityCount === 1 ? "Activity" : "Activities"}`}
        >
          <span className="block tabular-nums">
            {formattedActivityCount}
          </span>
          <span className="sr-only">
            {activityDesign.activityCount === 1 ? "Activity" : "Activities"}
          </span>
        </TableCell>
        <TableCell className="text-center text-muted-foreground tabular-nums">
          <span aria-label="Meal schedules coming later">—</span>
        </TableCell>
        <TableCell className="text-center">
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
}: {
  activityDesigns: ActivityDesignListItem[];
  filters: { search: string };
  onClearFilters: () => void;
  onNew: () => void;
  onEdit: (activityDesign: ActivityDesignListItem) => void;
  onAddActivity: (activityDesign: ActivityDesignListItem) => void;
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
      <ListEmptyState
        icon={<span aria-hidden="true">AD</span>}
        hasFilters={hasFilters}
        filteredState={{
          title: "No Activity Designs match your current filters.",
          description:
            "Clear filters to see the complete Activity Designs list.",
          action: {
            label: "Clear filters",
            variant: "outline",
            onClick: onClearFilters,
          },
        }}
        emptyState={{
          title: "No Activity Designs yet.",
          description: "Create an Activity Design to begin planning.",
          action: {
            label: "New Activity Design",
            onClick: onNew,
          },
        }}
      />
    );
  }

  return (
    <WorkspaceTableFrame
      caption="Activity Designs"
      className="min-w-[52rem]"
    >
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col" className="text-left">
            Design No.
          </TableHead>
          <TableHead scope="col" className="text-left">
            Activity Design
          </TableHead>
          <TableHead scope="col" className="text-center">
            Fiscal Year
          </TableHead>
          <TableHead scope="col" className="text-center">
            Activities
          </TableHead>
          <TableHead scope="col" className="text-center">
            Meal Schedules
          </TableHead>
          <TableHead scope="col" className="text-center">
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
            onAddActivity={() => onAddActivity(activityDesign)}
            onDeleted={() => handleDeleted(activityDesign.id)}
          />
        ))}
      </TableBody>
    </WorkspaceTableFrame>
  );
}
