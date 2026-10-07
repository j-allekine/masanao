"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ArrowLeft, CalendarDays, ClipboardList, Plus } from "lucide-react";

import { buttonVariants, Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { formatCentavosAsPesos } from "@/features/activity-planning/domain/planned-budget";
import { cn } from "@/lib/utils";

import type { ActivityDetailItem, MealScheduleListItem } from "../types";
import MealScheduleCreateDialog from "./meal-schedule-create-dialog";

const integerFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function displayOptional(value: string | number | null) {
  return value === null ? "Not recorded" : value;
}

function ActivityContext({ activity }: { activity: ActivityDetailItem }) {
  const fields = [
    ["Scheduled date", dateFormatter.format(new Date(activity.scheduledDate))],
    ["Office", activity.officeName],
    ["Venue", displayOptional(activity.venue)],
    [
      "Planned participants",
      activity.plannedParticipantCount === null
        ? "Not recorded"
        : integerFormatter.format(activity.plannedParticipantCount),
    ],
    [
      "Planned budget",
      activity.plannedBudgetCentavos === null
        ? "Not recorded"
        : formatCentavosAsPesos(activity.plannedBudgetCentavos),
    ],
    ["Particulars", displayOptional(activity.particulars)],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList aria-hidden="true" />
          Activity context
        </CardTitle>
        <CardDescription>
          The planning information recorded for this Activity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-label font-medium text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-1 break-words text-body">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function MealScheduleRows({
  activityDesignId,
  activityId,
  schedules,
}: {
  activityDesignId: string;
  activityId: string;
  schedules: MealScheduleListItem[];
}) {
  return (
    <WorkspaceTableFrame
      caption="Meal Schedules under this Activity"
      className="min-w-[46rem]"
    >
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col">Meal Schedule</TableHead>
          <TableHead scope="col">Time</TableHead>
          <TableHead scope="col" className="text-right">
            Planned servings
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((schedule) => (
          <TableRow key={schedule.id}>
            <TableCell className="max-w-[24rem] font-medium">
              <Link
                href={`/activity-designs/${activityDesignId}/activities/${activityId}/meal-schedules/${schedule.id}`}
                aria-label={`Open Meal Schedule: ${schedule.label}`}
                className="block break-words text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {schedule.label}
              </Link>
            </TableCell>
            <TableCell className="font-mono tabular-nums">
              {schedule.mealTime}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {schedule.plannedServings === null
                ? "Not recorded"
                : integerFormatter.format(schedule.plannedServings)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </WorkspaceTableFrame>
  );
}

function MealSchedulesEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Empty className="min-h-60 rounded-lg border bg-background">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarDays aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No Meal Schedules yet.</EmptyTitle>
        <EmptyDescription>
          Add the first Meal Schedule for this Activity when its meal details are ready.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreate}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Add Meal Schedule
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export default function ActivityDetailContent({
  activity,
}: {
  activity: ActivityDetailItem;
}) {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const parentUrl = `/activity-designs/${activity.activityDesign.id}`;

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
              Review an Activity and its Meal Schedules.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/activity-designs" />}>
                Activity Designs
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={parentUrl} />}>
                {activity.activityDesign.activityDesignNo}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0 max-w-full">
              <BreadcrumbPage className="block truncate">{activity.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Link href={parentUrl} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "self-start")}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to Activity Design
        </Link>

        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-label font-medium uppercase tracking-label text-primary">
              Activity
            </p>
            <h1 className="break-words text-heading-1 font-semibold">{activity.name}</h1>
            <p className="text-body text-muted-foreground">
              {dateFormatter.format(new Date(activity.scheduledDate))} · {activity.officeName}
            </p>
          </div>
        </div>

        <ActivityContext activity={activity} />

        <section aria-labelledby="activity-meal-schedules-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="activity-meal-schedules-title" className="text-heading-2 font-semibold">
                Meal Schedules
              </h2>
              <p className="text-body text-muted-foreground">
                Meals planned directly under this Activity.
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
              <Plus data-icon="inline-start" aria-hidden="true" />
              Add Meal Schedule
            </Button>
          </div>
          {activity.mealSchedules.length === 0 ? (
            <MealSchedulesEmptyState onCreate={() => setIsCreateDialogOpen(true)} />
          ) : (
            <MealScheduleRows
              activityDesignId={activity.activityDesign.id}
              activityId={activity.id}
              schedules={activity.mealSchedules}
            />
          )}
        </section>
      </main>

      <MealScheduleCreateDialog
        activity={activity}
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
