import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";

import type { ActivityDesignDetail } from "../types";
import ActivityList from "./activity-list";
import ActivityForm from "./forms/activity-form";

export default function ActivityDesignDetailContent({
  activityDesign,
}: {
  activityDesign: ActivityDesignDetail;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <div className="min-w-0 border-l pl-3">
            <p className="truncate text-xs text-muted-foreground">Plan</p>
            <p className="truncate text-sm font-medium">Activity design</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Planning workspace</div>
      </header>

      <main className="mx-auto flex w-full max-w-masanao-content flex-1 flex-col gap-8 px-6 py-8 sm:py-10">
        <div>
          <Button
            nativeButton={false}
            render={<Link href="/activity-designs" />}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft data-icon="inline-start" />
            Back to Activity Designs
          </Button>
        </div>

        <section aria-labelledby="activity-design-title" className="max-w-3xl">
          <p className="font-mono text-xs font-medium tracking-wide text-primary uppercase">
            {activityDesign.activityDesignNo}
          </p>
          <h1
            id="activity-design-title"
            className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            {activityDesign.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {activityDesign.officeName} · FY {activityDesign.fiscalYear}
          </p>
          {activityDesign.aipReferenceCode ? (
            <p className="mt-2 text-sm text-muted-foreground">
              AIP Reference Code: {activityDesign.aipReferenceCode}
            </p>
          ) : null}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-start">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Activities</CardTitle>
              <CardDescription>
                {activityDesign.activityCount === 0
                  ? "Activities can be saved before Meal Schedules are known."
                  : `${activityDesign.activityCount} saved ${activityDesign.activityCount === 1 ? "Activity" : "Activities"}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ActivityList activities={activityDesign.activities} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create an Activity</CardTitle>
              <CardDescription>
                Start with the undertaking and date. Add Meal Schedules later
                as the plan becomes complete.
              </CardDescription>
            </CardHeader>
            <ActivityForm activityDesignId={activityDesign.id} />
          </Card>
        </div>
      </main>
    </div>
  );
}
