"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getPlanningReturnUrl, withPlanningReturn } from "./planning-return-state";
import { useSyncExternalStore, type ReactNode } from "react";
import { RecordDetails } from "@/components/workspace/record-details";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import type { MealScheduleDetailItem } from "../types";

/** Planning details remain live; a posted heading may use its saved evidence. */
export default function MealScheduleHeader({ mealSchedule, title, status, ready, disabled = false, showDetails = true, summary }: {
  mealSchedule: MealScheduleDetailItem;
  title?: string;
  status?: ReactNode;
  ready?: boolean;
  disabled?: boolean;
  showDetails?: boolean;
  summary?: ReactNode;
}) {
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const isReady = ready ?? hydrated;
  const returnUrl = getPlanningReturnUrl(useSearchParams().get("planningReturn"));
  const { activity } = mealSchedule;
  const design = activity.activityDesign;
  const currentTitle = `${mealSchedule.label} · ${mealSchedule.mealTime}`;
  const fields = [
    { label: "Office", value: activity.officeName },
    ...(activity.venue ? [{ label: "Venue", value: activity.venue }] : []),
    ...(title && title !== currentTitle ? [{ label: "Current planning meal", value: currentTitle }] : []),
  ];
  return (
    <div className="flex min-w-0 flex-col gap-4" data-client-ready={isReady ? "true" : undefined}>
      <div className="flex min-w-0 items-start gap-3">
        <Breadcrumb className="min-w-0 pt-1">
          <BreadcrumbList className="break-words">
            <BreadcrumbItem><BreadcrumbLink render={<Link href={returnUrl} />}>{returnUrl.startsWith("/activities") ? "Activities" : "Activity Designs"}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink render={<Link href={withPlanningReturn(`/activity-designs/${design.id}`, returnUrl)} />}>{design.activityDesignNo}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0"><BreadcrumbLink className="break-words" render={<Link href={withPlanningReturn(`/activity-designs/${design.id}/activities/${activity.id}`, returnUrl)} />}>{activity.name}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0"><BreadcrumbPage className="break-words">{mealSchedule.label}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className={summary ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" : "flex flex-wrap items-start justify-between gap-3"}>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-heading-2 font-semibold">{title ?? `${mealSchedule.label} · ${mealSchedule.mealTime}`}</h1>
          {summary ? <p className="mt-2 text-body-sm text-muted-foreground">{summary}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status}

        </div>
      </div>
      {showDetails ? <RecordDetails fields={fields} disabled={!isReady || disabled} /> : null}
    </div>
  );
}
