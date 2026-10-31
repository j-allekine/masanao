"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { withPlanningReturn } from "./planning-return-state";
import ActivityDesignActionsMenu from "./activity-design-actions-menu";
import DeleteActivityDesignDialog from "./delete-activity-design-dialog";

const activityCountFormatter = new Intl.NumberFormat("en-US");

function ActivityDesignRow({
  activityDesign,
  catalogUrl,
  onEdit,
  onAddActivity,
  onDeleted,
}: {
  activityDesign: ActivityDesignListItem;
  catalogUrl: string;
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
        <TableCell data-label="Design No." className="w-[18%] font-mono text-mono tracking-mono text-muted-foreground">
          {activityDesign.activityDesignNo}
        </TableCell>
        <TableCell data-primary data-label="Activity Design" className="w-[40%]">
          <Link
            href={withPlanningReturn(`/activity-designs/${activityDesign.id}`, catalogUrl)}
            className="workspace-record-link"
          >
            {activityDesign.title}
          </Link>
        </TableCell>
        <TableCell data-label="Fiscal Year" className="w-[14%] text-right tabular-nums">
          {activityDesign.fiscalYear}
        </TableCell>
        <TableCell
          data-label="Activities"
          className="w-[16%] text-right tabular-nums"
          aria-label={`${formattedActivityCount} ${activityDesign.activityCount === 1 ? "Activity" : "Activities"}`}
        >
          <span className="block tabular-nums">
            {formattedActivityCount}
          </span>
          <span className="sr-only">
            {activityDesign.activityCount === 1 ? "Activity" : "Activities"}
          </span>
        </TableCell>
        <TableCell data-actions className="w-[12%] text-right">
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
  catalogUrl = "/activity-designs",
  filters,
  onClearFilters,
  onEdit,
  onAddActivity,
}: {
  activityDesigns: ActivityDesignListItem[];
  catalogUrl?: string;
  filters: { search: string };
  onClearFilters: () => void;
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
          description: "Use Create Activity Design to begin planning.",
        }}
      />
    );
  }

  return (
    <WorkspaceTableFrame
      caption="Activity Designs"
      responsive
    >
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col" className="w-[18%] text-left">
            Design No.
          </TableHead>
          <TableHead scope="col" className="w-[40%] text-left">
            Activity Design
          </TableHead>
          <TableHead scope="col" className="w-[14%] text-right">
            Fiscal Year
          </TableHead>
          <TableHead scope="col" className="w-[16%] text-right">
            Activities
          </TableHead>
          <TableHead scope="col" className="w-[12%] text-right">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activityDesigns.map((activityDesign) => (
          <ActivityDesignRow
            key={activityDesign.id}
            activityDesign={activityDesign}
            catalogUrl={catalogUrl}
            onEdit={() => onEdit(activityDesign)}
            onAddActivity={() => onAddActivity(activityDesign)}
            onDeleted={() => handleDeleted(activityDesign.id)}
          />
        ))}
      </TableBody>
    </WorkspaceTableFrame>
  );
}
