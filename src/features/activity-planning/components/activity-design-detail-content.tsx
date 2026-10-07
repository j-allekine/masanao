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

import type {
  ActivityDesignDetailActivity,
  ActivityDesignDetailItem,
  ActivityDesignListItem,
} from "../types";
import ActivityCreateDialog from "./activity-create-dialog";

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
          <p className="mt-1 font-mono text-mono font-medium tabular-nums">
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
  activityDesignId,
  activities,
}: {
  activityDesignId: string;
  activities: ActivityDesignDetailActivity[];
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
          <TableHead scope="col" className="text-right">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((activity) => (
          <TableRow key={activity.id}>
            <TableCell className="max-w-[24rem] font-medium">
              <span className="block truncate">{activity.name}</span>
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
            <TableCell className="text-right">
              <Link
                href={`/activity-designs/${activityDesignId}/activities/${activity.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Open Activity
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </WorkspaceTableFrame>
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
  const createParent: ActivityDesignListItem = {
    id: activityDesign.id,
    activityDesignNo: activityDesign.activityDesignNo,
    fiscalYear: activityDesign.fiscalYear,
    title: activityDesign.title,
    aipReferenceCode: activityDesign.aipReferenceCode,
    activityCount: activityDesign.activityCount,
  };

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
              {activityDesign.activityDesignNo} · {activityDesign.title}
            </h1>
            <p className="text-body text-muted-foreground">
              Review its planning context and create Activities under this design.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              className="w-full sm:w-auto"
              size="lg"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create Activity
            </Button>
            <Link
              href="/activity-designs"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full sm:w-auto",
              )}
            >
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              Back to Activity Designs
            </Link>
          </div>
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
            {activityDesign.activities.length > 0 ? (
              <p className="text-body-sm text-muted-foreground">
                {formatActivityCount(activityDesign.activityCount)}
              </p>
            ) : null}
          </div>
          {activityDesign.activities.length === 0 ? (
            <ActivitiesEmptyState onCreate={() => setIsCreateDialogOpen(true)} />
          ) : (
            <ActivityRows
              activityDesignId={activityDesign.id}
              activities={activityDesign.activities}
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
        }}
      />
    </div>
  );
}
