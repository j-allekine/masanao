"use client";

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

import type { ActivityWorkspaceListItem } from "../types";
import {
  hasActivityFilters,
  type ActivityFilters,
} from "./activity-filters";
import ActivityActionsMenu from "./activity-actions-menu";

const mealScheduleCountFormatter = new Intl.NumberFormat("en-US");

function ActivityRow({
  activity,
  onEdit,
}: {
  activity: ActivityWorkspaceListItem;
  onEdit: () => void;
}) {
  const formattedMealScheduleCount = mealScheduleCountFormatter.format(
    activity.mealScheduleCount,
  );

  return (
    <TableRow className="hover:bg-muted/35">
      <TableCell className="max-w-[28rem]">
        <span className="block truncate">{activity.name}</span>
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
        />
      </TableCell>
    </TableRow>
  );
}

export default function ActivitiesTable({
  activities,
  filters,
  onClearSearch,
  onEdit,
}: {
  activities: ActivityWorkspaceListItem[];
  filters: ActivityFilters;
  onClearSearch: () => void;
  onEdit: (activity: ActivityWorkspaceListItem) => void;
}) {
  const hasFilters = hasActivityFilters(filters);

  if (activities.length === 0) {
    return (
      <Empty className="min-h-60 rounded-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <span aria-hidden="true">A</span>
          </EmptyMedia>
          <EmptyTitle>
            {hasFilters
              ? "No Activities match your current search."
              : "No Activities yet."}
          </EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? "Clear the search to see the complete Activities list."
              : "Activities created under Activity Designs will appear here."}
          </EmptyDescription>
        </EmptyHeader>
        {hasFilters ? (
          <EmptyContent>
            <Button type="button" variant="outline" onClick={onClearSearch}>
              Clear search
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <Table className="min-w-[44rem]">
        <caption className="sr-only">Activities</caption>
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
              onEdit={() => onEdit(activity)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
