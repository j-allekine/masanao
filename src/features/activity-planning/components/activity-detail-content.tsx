"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CalendarDays, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { RecordDetails, RecordFacts } from "@/components/workspace/record-details";
import { getPlanningReturnUrl, withPlanningReturn } from "./planning-return-state";
import WorkspaceHeader from "@/components/workspace/workspace-header";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import { formatCentavosAsPesos } from "@/features/activity-planning/domain/planned-budget";
import { toast } from "sonner";

import type { ActivityDetailItem, MealScheduleListItem } from "../types";
import ActivityActionsMenu from "./activity-actions-menu";
import DeleteMealScheduleDialog from "./delete-meal-schedule-dialog";
import MealScheduleCreateDialog from "./meal-schedule-create-dialog";

const integerFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function MealScheduleRows({
  activityDesignId,
  activityId,
  schedules,
  onEdit,
  onDeleted,
}: {
  activityDesignId: string;
  activityId: string;
  schedules: MealScheduleListItem[];
  onEdit: (schedule: MealScheduleListItem) => void;
  onDeleted: (schedule: MealScheduleListItem) => void;
}) {
  return (
    <WorkspaceTableFrame
      caption="Meal Schedules under this Activity"
      className="w-full"
    >
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col">Meal Schedule</TableHead>
          <TableHead scope="col" className="hidden sm:table-cell">Time</TableHead>
          <TableHead scope="col" className="text-center">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((schedule) => (
          <MealScheduleRow
            key={schedule.id}
            activityDesignId={activityDesignId}
            activityId={activityId}
            schedule={schedule}
            onEdit={onEdit}
            onDeleted={onDeleted}
          />
        ))}
      </TableBody>
    </WorkspaceTableFrame>
  );
}

function MealScheduleRow({
  activityDesignId,
  activityId,
  schedule,
  onEdit,
  onDeleted,
}: {
  activityDesignId: string;
  activityId: string;
  schedule: MealScheduleListItem;
  onEdit: (schedule: MealScheduleListItem) => void;
  onDeleted: (schedule: MealScheduleListItem) => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const returnUrl = getPlanningReturnUrl(useSearchParams().get("planningReturn"));

  return (
    <>
      <TableRow className="hover:bg-muted/35">
        <TableCell className="max-w-[24rem] font-medium">
          <Link
            href={withPlanningReturn(`/activity-designs/${activityDesignId}/activities/${activityId}/meal-schedules/${schedule.id}`, returnUrl)}
            aria-label={`Open Meal Schedule: ${schedule.label}`}
            className="block break-words text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {schedule.label}
          </Link>
          <p className="mt-1 text-body-sm text-muted-foreground sm:hidden">Time: {schedule.mealTime}</p>
        </TableCell>
        <TableCell className="hidden font-mono tabular-nums sm:table-cell">
          {schedule.mealTime}
        </TableCell>
        <TableCell className="text-center">
          <ActivityActionsMenu
            activityName={schedule.label}
            actionButtonId={`meal-schedule-actions-${schedule.id}`}
            onEdit={() => onEdit(schedule)}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />
        </TableCell>
      </TableRow>
      <DeleteMealScheduleDialog
        activityDesignId={activityDesignId}
        activityId={activityId}
        mealSchedule={schedule}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={() => onDeleted(schedule)}
      />
    </>
  );
}

function MealSchedulesEmptyState() {
  return (
    <Empty className="min-h-40 rounded-lg border bg-background">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarDays aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No Meal Schedules yet.</EmptyTitle>
        <EmptyDescription>
          Add the first Meal Schedule for this Activity when its meal details are ready.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export default function ActivityDetailContent({
  activity,
}: {
  activity: ActivityDetailItem;
}) {
  const router = useRouter();
  const returnUrl = getPlanningReturnUrl(useSearchParams().get("planningReturn"));
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [mealScheduleForEdit, setMealScheduleForEdit] =
    useState<MealScheduleListItem | null>(null);
  const parentUrl = `/activity-designs/${activity.activityDesign.id}`;

  function closeEditDialog() {
    const closedMealSchedule = mealScheduleForEdit;
    setMealScheduleForEdit(null);

    window.setTimeout(() => {
      if (closedMealSchedule) {
        document
          .getElementById(`meal-schedule-actions-${closedMealSchedule.id}`)
          ?.focus();
      }
    }, 0);
  }

  return (
    <div
      className="flex min-h-svh flex-col bg-card"
      data-client-ready={isHydrated ? "true" : undefined}
    >
      <WorkspaceHeader title="Planning" />

      <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={returnUrl} />}>
                {returnUrl.startsWith("/activities") ? "Activities" : "Activity Designs"}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={withPlanningReturn(parentUrl, returnUrl)} />}>
                {activity.activityDesign.activityDesignNo}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0 max-w-full">
              <BreadcrumbPage className="break-words">{activity.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col gap-3">
          <h1 className="break-words text-heading-2 font-semibold">{activity.name}</h1>
          <RecordFacts fields={[
            { label: "Scheduled date", value: dateFormatter.format(new Date(activity.scheduledDate)) },
            { label: "Office", value: activity.officeName },
            { label: "Planned pax", value: activity.plannedParticipantCount === null ? "Not recorded" : integerFormatter.format(activity.plannedParticipantCount) },
          ]} />
        </div>
        <RecordDetails disabled={!isHydrated} fields={[
          ...(activity.venue ? [{ label: "Venue", value: activity.venue }] : []),
          ...(activity.plannedBudgetCentavos !== null ? [{ label: "Planned budget", value: formatCentavosAsPesos(activity.plannedBudgetCentavos) }] : []),
          ...(activity.particulars ? [{ label: "Particulars", value: activity.particulars }] : []),
        ]} />

        <section aria-labelledby="activity-meal-schedules-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="activity-meal-schedules-title" className="text-heading-3 font-semibold">
                Meal Schedules ({activity.mealSchedules.length})
              </h2>
            </div>
            <Button
              id="new-meal-schedule"
              onClick={() => setIsCreateDialogOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Add Meal Schedule
            </Button>
          </div>
          {activity.mealSchedules.length === 0 ? (
            <MealSchedulesEmptyState />
          ) : (
            <MealScheduleRows
              activityDesignId={activity.activityDesign.id}
              activityId={activity.id}
              schedules={activity.mealSchedules}
              onEdit={setMealScheduleForEdit}
              onDeleted={() => {
                router.refresh();
                toast.success("Meal Schedule deleted");
                window.setTimeout(() => {
                  document
                    .getElementById("new-meal-schedule")
                    ?.focus();
                }, 0);
              }}
            />
          )}
        </section>
      </main>

      <MealScheduleCreateDialog
        activity={activity}
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={(mealSchedule) => {
          setIsCreateDialogOpen(false);
          router.push(withPlanningReturn(`/activity-designs/${activity.activityDesign.id}/activities/${activity.id}/meal-schedules/${mealSchedule.id}`, returnUrl));
          toast.success("Meal Schedule added");
        }}
      />
      <MealScheduleCreateDialog
        key={mealScheduleForEdit?.id ?? "edit-meal-schedule"}
        activity={activity}
        mealSchedule={mealScheduleForEdit ?? undefined}
        mode="edit"
        open={mealScheduleForEdit !== null}
        onClose={closeEditDialog}
        onSuccess={() => {
          closeEditDialog();
          router.refresh();
          toast.success("Meal Schedule updated");
        }}
      />
    </div>
  );
}
