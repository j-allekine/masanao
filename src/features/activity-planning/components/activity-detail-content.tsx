"use client";

import Link from "next/link";
import { getDashboardOriginUrl } from "@/features/supply-operations/components/dashboard-origin-state";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { getPlanningCatalogReturnUrl, getPlanningReturnUrl } from "./planning-return-state";
import { WorkspaceContent } from "@/components/workspace/workspace-content";
import { WorkspaceRecordBreadcrumbs, WorkspaceRecordHeading } from "@/components/workspace/record-presentation";
import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";
import { filterMealSchedules, getMealSchedulesQuery, getMealSchedulesState, getPlanningRecordUrl, PLANNING_CHILD_PAGE_SIZE, writePlanningChildUrl } from "./planning-child-state";
import { usePlanningChildReturnFocus } from "./planning-child-return-focus";
import CatalogPagination, { getCatalogPageContainingItem } from "@/components/workspace/catalog-pagination";
import { WorkspaceSearchField } from "@/components/workspace/catalog-controls";
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
  const params = useSearchParams();

  return (
    <>
      <TableRow className="hover:bg-muted/35">
        <TableCell data-primary className="whitespace-normal font-medium">
          <Link
            href={getPlanningRecordUrl(`/activity-designs/${activityDesignId}/activities/${activityId}/meal-schedules/${schedule.id}`, params, activityDesignId, activityId)}
            id={`open-child-meal-${schedule.id}`}
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
  const params = useSearchParams();
  const returnUrl = getPlanningReturnUrl(params.get("planningReturn"));
  const dashboardReturnUrl = getDashboardOriginUrl(params, activity.activityDesign.id, activity.id);
  const catalogReturnUrl = getPlanningCatalogReturnUrl(params.get("planningReturn"), activity.activityDesign.id, activity.id);
  const pathname = usePathname();
  const query = params.toString();
  const state = getMealSchedulesState(params, activity.id);
  const filtered = filterMealSchedules(activity.mealSchedules, state.search);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PLANNING_CHILD_PAGE_SIZE));
  const page = Math.min(state.page, pageCount);
  const start = (page - 1) * PLANNING_CHILD_PAGE_SIZE;
  const visible = filtered.slice(start, start + PLANNING_CHILD_PAGE_SIZE);
  const showControls = activity.mealSchedules.length > PLANNING_CHILD_PAGE_SIZE || Boolean(state.search);
  const handledCreated = useRef<string | null>(null);
  function updateChildren(updates: Parameters<typeof getMealSchedulesQuery>[2], push = false, preserveReturnTarget = false) {
    const next = getMealSchedulesQuery(window.location.search.slice(1), activity.id, updates);
    const hash = !preserveReturnTarget && window.location.hash.startsWith("#open-child-meal-") ? "" : window.location.hash;
    writePlanningChildUrl(`${pathname}${next ? `?${next}` : ""}${hash}`, push);
  }
  usePlanningChildReturnFocus("open-child-meal-", filtered, page, PLANNING_CHILD_PAGE_SIZE, "activity-meal-schedules-title", page => updateChildren({ page }, false, true));
  useEffect(() => {
    if (!state.created || handledCreated.current === state.created || !activity.mealSchedules.some(row => row.id === state.created)) return;
    handledCreated.current = state.created;
    const cleared = !filtered.some(row => row.id === state.created);
    const rows = cleared ? activity.mealSchedules : filtered;
    const next = getMealSchedulesQuery(query, activity.id, { search: cleared ? "" : state.search, page: getCatalogPageContainingItem(rows, state.created, PLANNING_CHILD_PAGE_SIZE), created: null, notice: cleared ? "search-cleared" : undefined });
    writePlanningChildUrl(`${pathname}${next ? `?${next}` : ""}`);
  }, [activity.mealSchedules, activity.id, filtered, pathname, query, state.created, state.search]);
  useEffect(() => {
    if (!state.created && handledCreated.current) {
      const target = document.getElementById(`open-child-meal-${handledCreated.current}`);
      if (target) { target.focus(); handledCreated.current = null; }
    }
  }, [state.created, page]);
  useEffect(() => {
    if (state.page <= pageCount) return;
    const next = getMealSchedulesQuery(query, activity.id, { page: pageCount });
    writePlanningChildUrl(`${pathname}${next ? `?${next}` : ""}${window.location.hash}`);
  }, [activity.id, pageCount, pathname, query, state.created, state.page]);
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
        <WorkspaceRecordBreadcrumbs ancestors={[{ label: "Activity Designs", href: returnUrl.startsWith("/activities") ? getPlanningCatalogReturnUrl(null, activity.activityDesign.id) : catalogReturnUrl }, { label: activity.activityDesign.activityDesignNo, href: getPlanningRecordUrl(parentUrl, params, activity.activityDesign.id, activity.id) }]} currentLabel={activity.name} />
        {returnUrl.startsWith("/activities") ? <Link href={catalogReturnUrl} className="inline-flex min-h-10 items-center text-body-sm text-primary underline">Return to Activities</Link> : null}
        {dashboardReturnUrl ? <Link href={dashboardReturnUrl} className="inline-flex min-h-10 min-w-10 items-center text-body-sm text-primary underline">Return to Dashboard</Link> : null}
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
              <h2 id="activity-meal-schedules-title" tabIndex={-1} className="text-heading-3 font-semibold">
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
          {state.notice === "search-cleared" ? <p role="status" className="text-body-sm text-muted-foreground">Meal Schedule search cleared to show the new Meal Schedule.</p> : null}
          {showControls ? <div className="flex min-w-0 flex-wrap items-end gap-3">
            <WorkspaceSearchField id="meal-schedules-search" label="Search this Activity’s Meal Schedules by label or time" placeholder="Meal label or time" value={state.search} onValueChange={search => updateChildren({ search, page: 1 })} />
            {state.search ? <Button variant="outline" className="min-h-10" onClick={() => { updateChildren({ search: "", page: 1 }); document.getElementById("meal-schedules-search")?.focus(); }}>Clear Meal Schedule search</Button> : null}
            <p className="w-full text-body-sm text-muted-foreground">Results update as you type.</p>
          </div> : null}
          {activity.mealSchedules.length === 0 && !state.search ? (
            <MealSchedulesEmptyState />
          ) : !visible.length ? <Empty className="min-h-40 rounded-lg border"><EmptyHeader><EmptyTitle>No matching Meal Schedules</EmptyTitle><EmptyDescription>Clear Meal Schedule search to see this Activity’s Meal Schedules.</EmptyDescription></EmptyHeader></Empty> : (
            <MealScheduleRows
              activityDesignId={activity.activityDesign.id}
              activityId={activity.id}
              schedules={visible}
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
          {showControls ? <CatalogPagination page={page} pageCount={pageCount} start={visible.length ? start + 1 : 0} end={start + visible.length} total={filtered.length} onPageChange={page => updateChildren({ page }, true)} /> : null}
        </section>
      </WorkspaceContent>

      <ActivityCreateDialog activityDesign={activity.activityDesign} activity={activity} mode="edit" open={isRecordEditOpen} onClose={closeRecordEdit} onSuccess={() => { closeRecordEdit(); router.refresh(); toast.success("Activity updated"); }} />
      <DeleteActivityDialog activity={activity} open={isRecordDeleteOpen} onOpenChange={changeRecordDeleteOpen} onDeleted={() => { router.push(getPlanningRecordUrl(parentUrl, params, activity.activityDesign.id, activity.id)); toast.success("Activity deleted"); }} />
      <MealScheduleCreateDialog
        activity={activity}
        open={isCreateDialogOpen}
        restoreFocusOnSuccess={false}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={(mealSchedule) => {
          setIsCreateDialogOpen(false);
          updateChildren({ created: mealSchedule.id });
          router.refresh();
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
