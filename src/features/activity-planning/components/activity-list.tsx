"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarDays, ClipboardCheck, Pencil, Trash2 } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

import { deleteActivityAction } from "../actions";
import type { ActivityListItem } from "../types";
import ActivityEditForm from "./forms/activity-edit-form";
import MealScheduleForm from "./forms/meal-schedule-form";
import MealScheduleList from "./meal-schedule-list";

function formatScheduledDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}

function ActivityListItemCard({
  activity,
  onEdit,
  onDeleted,
}: {
  activity: ActivityListItem;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    setDeleteError(null);

    startDeleteTransition(async () => {
      try {
        const result = await deleteActivityAction(
          activity.activityDesignId,
          activity.id,
        );

        if (result.status === "error") {
          setDeleteError(result.error);
          return;
        }

        setIsDeleteDialogOpen(false);
        onDeleted();
      } catch {
        setDeleteError(
          "The Activity could not be deleted. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <li className="rounded-lg border bg-background p-4 transition-colors hover:bg-muted/40">
      <article className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{activity.name}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays aria-hidden="true" />
            <span>{formatScheduledDate(activity.scheduledDate)}</span>
          </p>
        </div>
        <p className="shrink-0 text-sm text-muted-foreground">
          {activity.mealScheduleCount === 0
            ? "No Meal Schedules yet"
            : `${activity.mealScheduleCount} Meal Schedule${activity.mealScheduleCount === 1 ? "" : "s"}`}
        </p>
      </article>
      {activity.particulars ? (
        <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
          {activity.particulars}
        </p>
      ) : null}
      {activity.venue ||
      activity.plannedParticipantCount !== null ||
      activity.plannedBudgetCentavos !== null ? (
        <dl className="mt-4 grid gap-3 border-t pt-3 text-sm sm:grid-cols-3">
          {activity.venue ? (
            <div>
              <dt className="text-xs text-muted-foreground">Venue</dt>
              <dd className="mt-1 font-medium">{activity.venue}</dd>
            </div>
          ) : null}
          {activity.plannedParticipantCount !== null ? (
            <div>
              <dt className="text-xs text-muted-foreground">Planned pax</dt>
              <dd className="mt-1 font-medium">
                {activity.plannedParticipantCount}
              </dd>
            </div>
          ) : null}
          {activity.plannedBudgetCentavos !== null ? (
            <div>
              <dt className="text-xs text-muted-foreground">Planned budget</dt>
              <dd className="mt-1 font-medium">
                {activity.plannedBudgetCentavos.toLocaleString("en-PH")} centavos
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <section
        aria-labelledby={`meal-schedules-title-${activity.id}`}
        className="mt-4"
      >
        <Separator className="mb-4" />
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h4
            id={`meal-schedules-title-${activity.id}`}
            className="text-sm font-semibold"
          >
            Meal Schedules
          </h4>
          <p className="text-xs text-muted-foreground">
            {activity.mealScheduleCount === 0
              ? "No schedules yet"
              : `${activity.mealScheduleCount} saved ${activity.mealScheduleCount === 1 ? "schedule" : "schedules"}`}
          </p>
        </div>
        <div className="mt-3">
          <MealScheduleList mealSchedules={activity.mealSchedules} />
        </div>
        <div className="mt-4">
          <MealScheduleForm
            activityDesignId={activity.activityDesignId}
            activityId={activity.id}
          />
        </div>
      </section>
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil data-icon="inline-start" />
          Edit
        </Button>
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) setDeleteError(null);
          }}
        >
          <AlertDialogTrigger
            render={<Button type="button" variant="ghost" size="sm" />}
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Activity?</AlertDialogTitle>
              <AlertDialogDescription>
                {activity.mealScheduleCount > 0
                  ? `This Activity has ${activity.mealScheduleCount} Meal Schedule${activity.mealScheduleCount === 1 ? "" : "s"}. Remove ${activity.mealScheduleCount === 1 ? "it" : "them"} before deleting this Activity.`
                  : "This permanently removes the Activity. It can only be deleted while it has no Meal Schedules."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError ? (
              <Alert variant="destructive">
                <AlertTitle>Deletion blocked</AlertTitle>
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Trash2 data-icon="inline-start" />
                )}
                {isDeleting ? "Deleting…" : "Delete Activity"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

export default function ActivityList({
  activities,
}: {
  activities: ActivityListItem[];
}) {
  const router = useRouter();
  const [editingActivity, setEditingActivity] =
    useState<ActivityListItem | null>(null);

  function handleActivityUpdated() {
    setEditingActivity(null);
    router.refresh();
  }

  if (activities.length === 0) {
    return (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardCheck aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Activities yet</EmptyTitle>
          <EmptyDescription>
            Add the first undertaking to this Activity Design. Meal Schedules
            can be added later as planning progresses.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <ul aria-label="Activities" className="flex flex-col gap-3">
        {activities.map((activity) => (
          <ActivityListItemCard
            activity={activity}
            key={activity.id}
            onEdit={() => setEditingActivity(activity)}
            onDeleted={() => router.refresh()}
          />
        ))}
      </ul>
      <Sheet
        open={editingActivity !== null}
        onOpenChange={(open) => {
          if (!open) setEditingActivity(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Activity</SheetTitle>
            <SheetDescription>
              Update the undertaking, date, and optional planning details.
            </SheetDescription>
          </SheetHeader>
          {editingActivity ? (
            <ActivityEditForm
              activity={editingActivity}
              onCancel={() => setEditingActivity(null)}
              onSuccess={handleActivityUpdated}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
