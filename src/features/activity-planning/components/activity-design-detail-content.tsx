"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
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
import { RecordDetails } from "@/components/workspace/record-details";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
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
import { toast } from "sonner";

import type {
  ActivityDesignDetailActivity,
  ActivityDesignDetailItem,
  ActivityDesignListItem,
} from "../types";
import ActivityActionsMenu from "./activity-actions-menu";
import ActivityCreateDialog from "./activity-create-dialog";
import DeleteActivityDialog from "./delete-activity-dialog";

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
    <WorkspaceTableFrame caption="Activities under this Activity Design" className="w-full">
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col">Activity</TableHead>
          <TableHead scope="col" className="hidden sm:table-cell">Scheduled date</TableHead>
          <TableHead scope="col" className="hidden sm:table-cell">Office</TableHead>
          <TableHead scope="col" className="hidden text-center sm:table-cell">
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
  const returnUrl = getPlanningReturnUrl(useSearchParams().get("planningReturn"));

  return (
    <>
      <TableRow className="hover:bg-muted/35">
        <TableCell className="max-w-[24rem] whitespace-normal font-medium">
          <Link
            href={withPlanningReturn(`/activity-designs/${activityDesign.id}/activities/${activity.id}`, returnUrl)}
            aria-label={`Open Activity: ${activity.name}`}
            className="block break-words text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {activity.name}
          </Link>
          <dl className="mt-2 grid gap-1 text-body-sm font-normal sm:hidden">
            <div><dt className="inline text-muted-foreground">Date: </dt><dd className="inline">{dateFormatter.format(new Date(activity.scheduledDate))}</dd></div>
            <div><dt className="inline text-muted-foreground">Office: </dt><dd className="inline break-words">{activity.officeName}</dd></div>
            <div><dt className="inline text-muted-foreground">Meal Schedules: </dt><dd className="inline">{activityCountFormatter.format(activity.mealScheduleCount)}</dd></div>
          </dl>
        </TableCell>
        <TableCell className="hidden tabular-nums sm:table-cell">
          {dateFormatter.format(new Date(activity.scheduledDate))}
        </TableCell>
        <TableCell className="hidden max-w-[20rem] sm:table-cell">
          <span className="block truncate">{activity.officeName}</span>
        </TableCell>
        <TableCell className="hidden text-center tabular-nums sm:table-cell">
          {activityCountFormatter.format(activity.mealScheduleCount)}
        </TableCell>
        <TableCell className="text-center">
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
  const returnUrl = getPlanningReturnUrl(useSearchParams().get("planningReturn"));
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
        <Breadcrumb><BreadcrumbList className="break-words">
          <BreadcrumbItem><BreadcrumbLink render={<Link href={returnUrl} />}>{returnUrl.startsWith("/activities") ? "Activities" : "Activity Designs"}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage className="break-words">{activityDesign.activityDesignNo}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList></Breadcrumb>
        <div className="flex flex-col gap-2">
          <h1 className="break-words text-heading-2 font-semibold">{activityDesign.title}</h1>
          <p className="text-body-sm text-muted-foreground">Fiscal year: {activityDesign.fiscalYear}</p>
        </div>
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
              className="w-full sm:w-auto"
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create Activity
            </Button>
          </div>
          {activityDesign.activities.length === 0 ? (
            <ActivitiesEmptyState />
          ) : (
            <ActivityRows
              activityDesign={createParent}
              activities={activityDesign.activities}
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
        </section>
      </div>

      <ActivityCreateDialog
        activityDesign={createParent}
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={(activity) => {
          setIsCreateDialogOpen(false);
          router.push(withPlanningReturn(`/activity-designs/${activity.activityDesignId}/activities/${activity.id}`, returnUrl));
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
