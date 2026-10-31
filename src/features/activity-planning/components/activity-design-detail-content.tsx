"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Inbox,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { RecordDetails, RecordFacts } from "@/components/workspace/record-details";

import { getPlanningReturnUrl } from "./planning-return-state";
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
import { toast } from "sonner";

import type {
  ActivityDesignDetailActivity,
  ActivityDesignDetailItem,
  ActivityDesignListItem,
} from "../types";
import ActivityDesignDialog from "./activity-design-dialog";
import DeleteActivityDesignDialog from "./delete-activity-design-dialog";
import ActivityActionsMenu from "./activity-actions-menu";
import ActivityCreateDialog from "./activity-create-dialog";
import DeleteActivityDialog from "./delete-activity-dialog";

import CatalogPagination, { getCatalogPageContainingItem } from "@/components/workspace/catalog-pagination";
import { WorkspaceSearchField } from "@/components/workspace/catalog-controls";
import { filterDesignActivities, getDesignActivitiesQuery, getDesignActivitiesState, getPlanningRecordUrl, PLANNING_CHILD_PAGE_SIZE, writePlanningChildUrl } from "./planning-child-state";

const activityCountFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function ActivityRows({
  activityDesign,
  activities,
  onEdit,
  onDeleted,
}: {
  activityDesign: ActivityDesignListItem;
  activities: ActivityDesignDetailActivity[];
  onEdit: (activity: ActivityDesignDetailActivity) => void;
  onDeleted: (activity: ActivityDesignDetailActivity) => void;
}) {
  return (
    <WorkspaceTableFrame responsive caption="Activities under this Activity Design" className="w-full">
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col">Activity</TableHead>
          <TableHead scope="col" >Scheduled date</TableHead>
          <TableHead scope="col" >Office</TableHead>
          <TableHead scope="col" className="text-center">
            Meal Schedules
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
            activityDesign={activityDesign}
            activity={activity}
            onEdit={onEdit}
            onDeleted={onDeleted}
          />
        ))}
      </TableBody>
    </WorkspaceTableFrame>
  );
}

function ActivityRow({
  activityDesign,
  activity,
  onEdit,
  onDeleted,
}: {
  activityDesign: ActivityDesignListItem;
  activity: ActivityDesignDetailActivity;
  onEdit: (activity: ActivityDesignDetailActivity) => void;
  onDeleted: (activity: ActivityDesignDetailActivity) => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const params = useSearchParams();

  return (
    <>
      <TableRow className="hover:bg-muted/35">
        <TableCell data-primary className="whitespace-normal font-medium">
          <Link
            href={getPlanningRecordUrl(`/activity-designs/${activityDesign.id}/activities/${activity.id}`, params, activityDesign.id, activity.id)}
            id={`open-child-activity-${activity.id}`}
            aria-label={`Open Activity: ${activity.name}`}
            className="block break-words text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {activity.name}
          </Link>

        </TableCell>
        <TableCell data-label="Scheduled date" className="tabular-nums">
          {dateFormatter.format(new Date(activity.scheduledDate))}
        </TableCell>
        <TableCell data-label="Office">
          <span className="wrap-anywhere">{activity.officeName}</span>
        </TableCell>
        <TableCell data-label="Meal Schedules" className="text-center tabular-nums">
          {activityCountFormatter.format(activity.mealScheduleCount)}
        </TableCell>
        <TableCell data-actions className="text-center">
          <ActivityActionsMenu
            activityName={activity.name}
            actionButtonId={`activity-actions-${activity.id}`}
            onEdit={() => onEdit(activity)}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />
        </TableCell>
      </TableRow>
      <DeleteActivityDialog
        activity={activity}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={() => onDeleted(activity)}
      />
    </>
  );
}

function ActivitiesEmptyState() {
  return (
    <Empty className="min-h-40 rounded-lg border bg-background">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No Activities yet.</EmptyTitle>
        <EmptyDescription>
          Activities created here stay under this Activity Design.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export default function ActivityDesignDetailContent({
  activityDesign,
}: {
  activityDesign: ActivityDesignDetailItem;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const query = params.toString();
  const returnUrl = getPlanningReturnUrl(params.get("planningReturn"));
  const state = getDesignActivitiesState(params, activityDesign.id);
  const filtered = filterDesignActivities(activityDesign.activities, state.search);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PLANNING_CHILD_PAGE_SIZE));
  const page = Math.min(state.page, pageCount);
  const start = (page - 1) * PLANNING_CHILD_PAGE_SIZE;
  const visible = filtered.slice(start, start + PLANNING_CHILD_PAGE_SIZE);
  const showControls = activityDesign.activities.length > PLANNING_CHILD_PAGE_SIZE || Boolean(state.search);
  const handledCreated = useRef<string | null>(null);
  function updateChildren(updates: Parameters<typeof getDesignActivitiesQuery>[2], push = false) {
    const next = getDesignActivitiesQuery(window.location.search.slice(1), activityDesign.id, updates);
    writePlanningChildUrl(`${pathname}${next ? `?${next}` : ""}${window.location.hash}`, push);
  }
  useEffect(() => {
    if (!state.created || handledCreated.current === state.created || !activityDesign.activities.some(row => row.id === state.created)) return;
    handledCreated.current = state.created;
    const cleared = !filtered.some(row => row.id === state.created);
    const rows = cleared ? activityDesign.activities : filtered;
    const next = getDesignActivitiesQuery(query, activityDesign.id, { search: cleared ? "" : state.search, page: getCatalogPageContainingItem(rows, state.created, PLANNING_CHILD_PAGE_SIZE), created: null });
    writePlanningChildUrl(`${pathname}${next ? `?${next}` : ""}`);
    if (cleared) toast.info("Activity search cleared to show the new Activity.");
  }, [activityDesign.activities, activityDesign.id, filtered, pathname, query, state.created, state.search]);
  useEffect(() => {
    if (!state.created && handledCreated.current) {
      const target = document.getElementById(`open-child-activity-${handledCreated.current}`);
      if (target) { target.focus(); handledCreated.current = null; }
    }
  }, [state.created, page]);
  useEffect(() => {
    if (state.page <= pageCount) return;
    const next = getDesignActivitiesQuery(query, activityDesign.id, { page: pageCount });
    writePlanningChildUrl(`${pathname}${next ? `?${next}` : ""}${window.location.hash}`);
  }, [activityDesign.id, pageCount, pathname, query, state.created, state.page]);
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
  const [activityForEdit, setActivityForEdit] =
    useState<ActivityDesignDetailActivity | null>(null);
  const createParent: ActivityDesignListItem = {
    id: activityDesign.id,
    activityDesignNo: activityDesign.activityDesignNo,
    fiscalYear: activityDesign.fiscalYear,
    title: activityDesign.title,
    aipReferenceCode: activityDesign.aipReferenceCode,
    activityCount: activityDesign.activityCount,
  };

  function closeEditDialog() {
    const closedActivity = activityForEdit;
    setActivityForEdit(null);

    window.setTimeout(() => {
      if (closedActivity) {
        document
          .getElementById(`activity-actions-${closedActivity.id}`)
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
        <WorkspaceRecordBreadcrumbs ancestors={[{ label: "Activity Designs", href: returnUrl.startsWith("/activities") ? "/activity-designs" : returnUrl }]} currentLabel={activityDesign.activityDesignNo} />
        {returnUrl.startsWith("/activities") ? <Link href={returnUrl} className="text-body-sm text-primary underline">Return to Activities</Link> : null}
        <WorkspaceRecordHeading title={activityDesign.title} actions={<>
          <Button id="edit-current-record" variant="outline" size="lg" className="min-h-10" disabled={!isHydrated} onClick={() => setIsRecordEditOpen(true)}>Edit Activity Design</Button>
          <WorkspaceRowActionMenu actionButtonId="current-record-actions" ariaLabel="More Activity Design actions" disabled={!isHydrated} groups={[{ actions: [{ label: "Delete Activity Design", variant: "destructive", onSelect: () => setIsRecordDeleteOpen(true) }] }]} />
        </>}><RecordFacts fields={[{ label: "Fiscal year", value: activityDesign.fiscalYear }]} /></WorkspaceRecordHeading>
        <RecordDetails disabled={!isHydrated} fields={activityDesign.aipReferenceCode ? [{ label: "AIP reference", value: activityDesign.aipReferenceCode }] : []} />

        <section aria-labelledby="activity-design-activities-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="activity-design-activities-title" className="text-heading-3 font-semibold">
                Activities ({activityDesign.activityCount})
              </h2>
            </div>
            <Button
              id="new-activity"
              onClick={() => setIsCreateDialogOpen(true)}
              size="lg"
              className="min-h-10 w-full sm:w-auto"
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create Activity
            </Button>
          </div>
          {showControls ? <div className="flex min-w-0 flex-wrap items-end gap-3">
            <WorkspaceSearchField id="design-activities-search" label="Search this Design’s Activities by name or Office" placeholder="Activity or Office" value={state.search} onValueChange={search => updateChildren({ search, page: 1 })} />
            {state.search ? <Button variant="outline" className="min-h-10" onClick={() => { updateChildren({ search: "", page: 1 }); document.getElementById("design-activities-search")?.focus(); }}>Clear Activity search</Button> : null}
            <p className="w-full text-body-sm text-muted-foreground">Results update as you type.</p>
          </div> : null}
          {activityDesign.activities.length === 0 && !state.search ? (
            <ActivitiesEmptyState />
          ) : !visible.length ? <Empty className="min-h-40 rounded-lg border"><EmptyHeader><EmptyTitle>No matching Activities</EmptyTitle><EmptyDescription>Clear Activity search to see this Design’s Activities.</EmptyDescription></EmptyHeader></Empty> : (
            <ActivityRows
              activityDesign={createParent}
              activities={visible}
              onEdit={setActivityForEdit}
              onDeleted={() => {
                router.refresh();
                toast.success("Activity deleted");
                window.setTimeout(() => {
                  document.getElementById("new-activity")?.focus();
                }, 0);
              }}
            />
          )}
          {showControls ? <CatalogPagination page={page} pageCount={pageCount} start={visible.length ? start + 1 : 0} end={start + visible.length} total={filtered.length} onPageChange={page => updateChildren({ page }, true)} /> : null}
        </section>
      </WorkspaceContent>

      <ActivityDesignDialog dialogState={isRecordEditOpen ? { mode: "edit", activityDesign } : null} onClose={closeRecordEdit} onSuccess={() => { router.refresh(); toast.success("Activity Design updated"); }} />
      <DeleteActivityDesignDialog activityDesign={activityDesign} open={isRecordDeleteOpen} onOpenChange={changeRecordDeleteOpen} onDeleted={() => { router.push(returnUrl); toast.success("Activity Design deleted"); }} />
      <ActivityCreateDialog
        activityDesign={createParent}
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={(activity) => {
          setIsCreateDialogOpen(false);
          updateChildren({ created: activity.id });
          router.refresh();
          toast.success("Activity added");
        }}
      />
      <ActivityCreateDialog
        activityDesign={createParent}
        activity={activityForEdit ?? undefined}
        mode="edit"
        open={activityForEdit !== null}
        onClose={closeEditDialog}
        onSuccess={() => {
          closeEditDialog();
          router.refresh();
          toast.success("Activity updated");
        }}
      />
    </div>
  );
}
