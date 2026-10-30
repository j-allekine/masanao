"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CalendarDays, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { RecordDetails, RecordFacts } from "@/components/workspace/record-details";
import { getPlanningReturnUrl, withPlanningReturn } from "./planning-return-state";
import { WorkspaceContent } from "@/components/workspace/workspace-content";
import { WorkspaceRecordBreadcrumbs, WorkspaceRecordHeading } from "@/components/workspace/record-presentation";
import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";
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
import ActivityCreateDialog from "./activity-create-dialog";
import DeleteActivityDialog from "./delete-activity-dialog";
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
    <WorkspaceTableFrame responsive
      caption="Meal Schedules under this Activity"
      className="w-full"
    >
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col">Meal Schedule</TableHead>
          <TableHead scope="col" >Time</TableHead>
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
        <TableCell data-primary className="whitespace-normal font-medium">
          <Link
            href={withPlanningReturn(`/activity-designs/${activityDesignId}/activities/${activityId}/meal-schedules/${schedule.id}`, returnUrl)}
            aria-label={`Open Meal Schedule: ${schedule.label}`}
            className="block break-words text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {schedule.label}
          </Link>

        </TableCell>
        <TableCell data-label="Time" className="font-mono tabular-nums">
          {schedule.mealTime}
        </TableCell>
        <TableCell data-actions className="text-center">
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
  const [isRecordEditOpen, setIsRecordEditOpen] = useState(false);
  const [isRecordDeleteOpen, setIsRecordDeleteOpen] = useState(false);
  function closeRecordEdit() {
    setIsRecordEditOpen(false);
    window.setTimeout(() => document.getElementById("edit-current-record")?.focus(), 0);
  }
  function changeRecordDeleteOpen(open: boolean) {
    setIsRecordDeleteOpen(open);
    if (!open) window.setTimeout(() => document.getElementById("current-record-actions")?.focus(), 0);
  }
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

      <WorkspaceContent>
        <WorkspaceRecordBreadcrumbs ancestors={[{ label: "Activity Designs", href: returnUrl.startsWith("/activities") ? "/activity-designs" : returnUrl }, { label: activity.activityDesign.activityDesignNo, href: withPlanningReturn(parentUrl, returnUrl) }]} currentLabel={activity.name} />
        {returnUrl.startsWith("/activities") ? <Link href={returnUrl} className="text-body-sm text-primary underline">Return to Activities</Link> : null}
        <WorkspaceRecordHeading title={activity.name} actions={<>
          <Button id="edit-current-record" variant="outline" size="lg" className="min-h-10" disabled={!isHydrated} onClick={() => setIsRecordEditOpen(true)}>Edit Activity</Button>
          <WorkspaceRowActionMenu actionButtonId="current-record-actions" ariaLabel="More Activity actions" disabled={!isHydrated} groups={[{ actions: [{ label: "Delete Activity", variant: "destructive", onSelect: () => setIsRecordDeleteOpen(true) }] }]} />
        </>}><RecordFacts fields={[{ label: "Scheduled date", value: dateFormatter.format(new Date(activity.scheduledDate)) }, { label: "Office", value: activity.officeName }, { label: "Planned pax", value: activity.plannedParticipantCount === null ? "Not recorded" : integerFormatter.format(activity.plannedParticipantCount) }]} /></WorkspaceRecordHeading>
        <RecordDetails disabled={!isHydrated} fields={[
          ...(activity.venue ? [{ label: "Venue", value: activity.venue }] : []),
          ...(activity.plannedBudgetCentavos !== null ? [{ label: "Planned budget", value: formatCentavosAsPesos(activity.plannedBudgetCentavos) }] : []),
          ...(activity.particulars ? [{ label: "Particulars", value: <span className="whitespace-pre-wrap">{activity.particulars}</span> }] : []),
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
              size="lg"
              className="min-h-10 w-full sm:w-auto"
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
      </WorkspaceContent>

      <ActivityCreateDialog activityDesign={activity.activityDesign} activity={activity} mode="edit" open={isRecordEditOpen} onClose={closeRecordEdit} onSuccess={() => { closeRecordEdit(); router.refresh(); toast.success("Activity updated"); }} />
      <DeleteActivityDialog activity={activity} open={isRecordDeleteOpen} onOpenChange={changeRecordDeleteOpen} onDeleted={() => { router.push(withPlanningReturn(parentUrl, returnUrl)); toast.success("Activity deleted"); }} />
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
