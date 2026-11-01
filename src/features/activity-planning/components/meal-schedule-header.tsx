"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getPlanningCatalogReturnUrl, getPlanningReturnUrl } from "./planning-return-state";
import { useSyncExternalStore, type ReactNode } from "react";
import { getPlanningRecordUrl } from "./planning-child-state";
import { RecordDetails } from "@/components/workspace/record-details";
import { WorkspaceRecordBreadcrumbs } from "@/components/workspace/record-presentation";
import type { MealScheduleDetailItem } from "../types";
import { getDashboardOriginUrl } from "@/features/supply-operations/components/dashboard-origin-state";

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
  const params = useSearchParams();
  const returnUrl = getPlanningReturnUrl(params.get("planningReturn"));
  const { activity } = mealSchedule;
  const design = activity.activityDesign;
  const dashboardReturnUrl = getDashboardOriginUrl(params, design.id, activity.id);
  const catalogReturnUrl = getPlanningCatalogReturnUrl(params.get("planningReturn"), design.id, activity.id);
  const currentTitle = `${mealSchedule.label} · ${mealSchedule.mealTime}`;
  const fields = [
    { label: "Office", value: activity.officeName },
    ...(activity.venue ? [{ label: "Venue", value: activity.venue }] : []),
    ...(title && title !== currentTitle ? [{ label: "Current planning meal", value: currentTitle }] : []),
  ];
  return (
    <div className="flex min-w-0 flex-col gap-4" data-client-ready={isReady ? "true" : undefined}>
      <WorkspaceRecordBreadcrumbs ancestors={[
        { label: "Activity Designs", href: returnUrl.startsWith("/activities") ? getPlanningCatalogReturnUrl(null, design.id) : catalogReturnUrl },
        { label: design.activityDesignNo, href: getPlanningRecordUrl(`/activity-designs/${design.id}`, params, design.id, activity.id, mealSchedule.id) },
        { label: activity.name, href: getPlanningRecordUrl(`/activity-designs/${design.id}/activities/${activity.id}`, params, design.id, activity.id, mealSchedule.id) },
      ]} currentLabel={mealSchedule.label} />
      {returnUrl.startsWith("/activities") ? <Link href={catalogReturnUrl} className="inline-flex min-h-10 items-center text-body-sm text-primary underline">Return to Activities</Link> : null}
      {dashboardReturnUrl ? <Link href={dashboardReturnUrl} className="inline-flex min-h-10 min-w-10 items-center text-body-sm text-primary underline">Return to Dashboard</Link> : null}
      <div className={summary ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" : "flex flex-wrap items-start justify-between gap-3"}>
        <div className="min-w-0 flex-1">
          <h1 className="workspace-page-title break-words font-semibold">{title ?? `${mealSchedule.label} · ${mealSchedule.mealTime}`}</h1>
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
