"use client";

import { useState } from "react";
import Link from "next/link";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ListEmptyState from "@/components/workspace/list-empty-state";
import WorkspaceTableFrame from "@/components/workspace/table-frame";

import type { ActivityWorkspaceListItem } from "../types";
import {
  hasActivityFilters,
  type ActivityFilters,
} from "./activity-filters";
import ActivityActionsMenu from "./activity-actions-menu";
import DeleteActivityDialog from "./delete-activity-dialog";
import { withPlanningReturn } from "./planning-return-state";

const mealScheduleCountFormatter = new Intl.NumberFormat("en-US");

function ActivityRow({
  activity,
  catalogUrl,
  onEdit,
  onDelete,
}: {
  activity: ActivityWorkspaceListItem;
  catalogUrl: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const formattedMealScheduleCount = mealScheduleCountFormatter.format(
    activity.mealScheduleCount,
  );

  return (
    <>
      <TableRow className="hover:bg-muted/35">
      <TableCell className="max-w-[28rem]">
        <Link
          href={withPlanningReturn(`/activity-designs/${activity.activityDesignId}/activities/${activity.id}`, catalogUrl)}
          className="block truncate font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {activity.name}
        </Link>
      </TableCell>
      <TableCell className="max-w-[28rem]">
        <span className="block truncate">{activity.activityDesignTitle}</span>
      </TableCell>
      <TableCell
        className="text-center tabular-nums"
        aria-label={`${formattedMealScheduleCount} ${activity.mealScheduleCount === 1 ? "Meal Schedule" : "Meal Schedules"}`}
      >
        {formattedMealScheduleCount}
      </TableCell>
      <TableCell className="text-center">
        <ActivityActionsMenu
          activityName={activity.name}
          actionButtonId={`activity-actions-${activity.id}`}
          onEdit={onEdit}
          onDelete={() => setIsDeleteDialogOpen(true)}
        />
      </TableCell>
      </TableRow>
      <DeleteActivityDialog
        key={`${activity.id}-${isDeleteDialogOpen ? "open" : "closed"}`}
        activity={activity}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={onDelete}
      />
    </>
  );
}

export default function ActivitiesTable({
  activities,
  catalogUrl = "/activities",
  filters,
  onClearSearch,
  onEdit,
  onDeleted,
}: {
  activities: ActivityWorkspaceListItem[];
  catalogUrl?: string;
  filters: ActivityFilters;
  onClearSearch: () => void;
  onEdit: (activity: ActivityWorkspaceListItem) => void;
  onDeleted: (activityId: string) => void;
}) {
  const hasFilters = hasActivityFilters(filters);

  if (activities.length === 0) {
    return (
      <ListEmptyState
        icon={<span aria-hidden="true">A</span>}
        hasFilters={hasFilters}
        filteredState={{
          title: "No Activities match your current search.",
          description: "Clear the search to see the complete Activities list.",
          action: {
            label: "Clear search",
            variant: "outline",
            onClick: onClearSearch,
          },
        }}
        emptyState={{
          title: "No Activities yet.",
          description:
            "Activities created under Activity Designs will appear here.",
        }}
      />
    );
  }

  return (
    <WorkspaceTableFrame caption="Activities" className="min-w-[44rem]">
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col" className="text-left">
            Activity name
          </TableHead>
          <TableHead scope="col" className="text-left">
            Activity Design title
          </TableHead>
          <TableHead scope="col" className="text-center">
            Meal Schedule count
          </TableHead>
          <TableHead scope="col" className="text-center">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((activity) => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            catalogUrl={catalogUrl}
            onEdit={() => onEdit(activity)}
            onDelete={() => onDeleted(activity.id)}
          />
        ))}
      </TableBody>
    </WorkspaceTableFrame>
  );
}
