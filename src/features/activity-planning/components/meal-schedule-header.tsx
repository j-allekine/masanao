"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import type { MealScheduleDetailItem } from "../types";

/** Planning details remain live; a posted heading may use its saved evidence. */
export default function MealScheduleHeader({ mealSchedule, title, status, ready, disabled = false }: {
  mealSchedule: MealScheduleDetailItem;
  title?: string;
  status?: ReactNode;
  ready?: boolean;
  disabled?: boolean;
}) {
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const isReady = ready ?? hydrated;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { activity } = mealSchedule;
  const design = activity.activityDesign;
  const fields = [
    ["Activity Design", `${design.activityDesignNo} · ${design.title}`],
    ["Activity", activity.name],
    ["Meal", mealSchedule.label],
    ["Meal time", mealSchedule.mealTime],
    ["Office", activity.officeName],
    ...(activity.venue ? [["Venue", activity.venue]] : []),
  ];
  return (
    <div className="flex min-w-0 flex-col gap-4" data-client-ready={isReady ? "true" : undefined}>
      <div className="flex min-w-0 items-start gap-3">
        <SidebarTrigger className="shrink-0" />
        <Breadcrumb className="min-w-0 pt-1">
          <BreadcrumbList className="break-words">
            <BreadcrumbItem><BreadcrumbLink render={<Link href="/activity-designs" />}>Activity Designs</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink render={<Link href={`/activity-designs/${design.id}`} />}>{design.activityDesignNo}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0"><BreadcrumbLink className="break-words" render={<Link href={`/activity-designs/${design.id}/activities/${activity.id}`} />}>{activity.name}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0"><BreadcrumbPage className="break-words">{mealSchedule.label}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 break-words text-heading-2 font-semibold">{title ?? `${mealSchedule.label} · ${mealSchedule.mealTime}`}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {status}
          <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
            <SheetTrigger render={<Button variant="outline" disabled={!isReady || disabled} />}>Meal details</SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Meal details</SheetTitle>
                <SheetDescription>Current planning details.</SheetDescription>
              </SheetHeader>
              <dl className="flex flex-col gap-4 px-4 pb-6">
                {fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-label text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-body">{value}</dd></div>)}
              </dl>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
