"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ClipboardList,
  Inbox,
  Plus,
} from "lucide-react";

import { buttonVariants, Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import { cn } from "@/lib/utils";
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

function formatActivityCount(count: number) {
  return `${activityCountFormatter.format(count)} ${count === 1 ? "Activity" : "Activities"}`;
}

function ActivityDesignContext({
  activityDesign,
}: {
  activityDesign: ActivityDesignDetailItem;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList aria-hidden="true" />
          Activity Design context
        </CardTitle>
        <CardDescription>
          The planning information recorded for this Activity Design.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="min-w-0">
          <p className="text-label font-medium text-muted-foreground">
            Fiscal Year
          </p>
          <p className="mt-1 text-body font-medium tabular-nums">
            FY {activityDesign.fiscalYear}
          </p>
        </div>
        {activityDesign.aipReferenceCode ? (
          <div className="min-w-0">
            <p className="text-label font-medium text-muted-foreground">
              AIP reference
            </p>
            <p className="mt-1 break-words text-body">
              {activityDesign.aipReferenceCode}
            </p>
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-label font-medium text-muted-foreground">
            Activities
          </p>
          <p className="mt-1 text-body font-medium tabular-nums">
            {formatActivityCount(activityDesign.activityCount)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

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
    <WorkspaceTableFrame caption="Activities under this Activity Design" className="min-w-[46rem]">
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col">Activity</TableHead>
          <TableHead scope="col">Scheduled date</TableHead>
          <TableHead scope="col">Office</TableHead>
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

  return (
    <>
      <TableRow className="hover:bg-muted/35">
        <TableCell className="max-w-[24rem] font-medium">
          <Link
            href={`/activity-designs/${activityDesign.id}/activities/${activity.id}`}
            aria-label={`Open Activity: ${activity.name}`}
            className="block break-words text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {activity.name}
          </Link>
        </TableCell>
        <TableCell className="tabular-nums">
          {dateFormatter.format(new Date(activity.scheduledDate))}
        </TableCell>
        <TableCell className="max-w-[20rem]">
          <span className="block truncate">{activity.officeName}</span>
        </TableCell>
        <TableCell className="text-center tabular-nums">
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

function ActivitiesEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Empty className="min-h-60 rounded-lg border bg-background">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No Activities yet.</EmptyTitle>
        <EmptyDescription>
          Activities created here stay under this Activity Design.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreate}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Create Activity
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export default function ActivityDesignDetailContent({
  activityDesign,
}: {
  activityDesign: ActivityDesignDetailItem;
}) {
  const router = useRouter();
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
      <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-8" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-heading-3 font-semibold">Planning</p>
            <p className="truncate text-body-sm text-muted-foreground">
              Review an Activity Design and its Activities.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-label font-medium uppercase tracking-label text-primary">
              Activity Design
            </p>
            <h1 className="break-words text-heading-1 font-semibold">
              {activityDesign.title}
            </h1>
            <p className="text-body text-muted-foreground">
              {activityDesign.activityDesignNo}
            </p>
          </div>
          <Link
            href="/activity-designs"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "self-start sm:self-auto",
            )}
          >
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Back to Activity Designs
          </Link>
        </div>

        <ActivityDesignContext activityDesign={activityDesign} />

        <section aria-labelledby="activity-design-activities-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="activity-design-activities-title" className="text-heading-2 font-semibold">
                Activities
              </h2>
              <p className="text-body text-muted-foreground">
                Undertakings planned under this Activity Design.
              </p>
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
            <ActivitiesEmptyState onCreate={() => setIsCreateDialogOpen(true)} />
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
      </main>

      <ActivityCreateDialog
        activityDesign={createParent}
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
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
