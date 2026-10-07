"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { MealScheduleDetailItem } from "../types";

const integerFormatter = new Intl.NumberFormat("en-US");

function displayOptional(value: string | number | null) {
  return value === null ? "Not recorded" : value;
}

function ScheduleContext({
  mealSchedule,
}: {
  mealSchedule: MealScheduleDetailItem;
}) {
  const fields = [
    ["Meal time", mealSchedule.mealTime],
    [
      "Planned servings",
      mealSchedule.plannedServings === null
        ? "Not recorded"
        : integerFormatter.format(mealSchedule.plannedServings),
    ],
    ["Activity Office", mealSchedule.activity.officeName],
    ["Venue", displayOptional(mealSchedule.activity.venue)],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList aria-hidden="true" />
          Meal Schedule context
        </CardTitle>
        <CardDescription>
          The planning information recorded for this Meal Schedule and its Activity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
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

export default function MealScheduleDetailContent({
  mealSchedule,
}: {
  mealSchedule: MealScheduleDetailItem;
}) {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const activityDesign = mealSchedule.activity.activityDesign;
  const activityUrl = `/activity-designs/${activityDesign.id}/activities/${mealSchedule.activity.id}`;

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
              Review a Meal Schedule and its planning context.
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
              <BreadcrumbLink
                render={<Link href={`/activity-designs/${activityDesign.id}`} />}
              >
                {activityDesign.activityDesignNo}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0 max-w-full">
              <BreadcrumbLink render={<Link href={activityUrl} />}>
                {mealSchedule.activity.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0 max-w-full">
              <BreadcrumbPage className="block truncate">
                {mealSchedule.label}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Link href={activityUrl} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "self-start")}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to Activity
        </Link>

        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-label font-medium uppercase tracking-label text-primary">
              Meal Schedule
            </p>
            <h1 className="break-words text-heading-1 font-semibold">
              {mealSchedule.label} · {mealSchedule.mealTime}
            </h1>
            <p className="text-body text-muted-foreground">
              Planned under {mealSchedule.activity.name}.
            </p>
          </div>
        </div>

        <ScheduleContext mealSchedule={mealSchedule} />

        <section aria-labelledby="future-issuance-title">
          <Card>
            <CardHeader>
              <CardTitle id="future-issuance-title">Future issuance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body text-muted-foreground">
                Supply issuance will be prepared from this Meal Schedule in a later operational slice.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
