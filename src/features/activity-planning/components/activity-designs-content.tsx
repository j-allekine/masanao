import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";

import ActivityDesignsWorkspace from "./activity-designs-workspace";
import ActivityDesignForm from "./forms/activity-design-form";
import PlanningSectionMenu from "./planning-section-menu";
import type { ActivityDesignListItem } from "../types";

export default function ActivityDesignsContent({
  initialActivityDesigns,
}: {
  initialActivityDesigns: ActivityDesignListItem[];
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <div className="min-w-0 border-l pl-3">
            <p className="truncate text-xs text-muted-foreground">Plan</p>
            <p className="truncate text-sm font-medium">Activity designs</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Planning workspace</div>
      </header>

      <main className="mx-auto flex w-full max-w-masanao-content flex-1 flex-col gap-8 px-6 py-8 sm:py-10">
        <PlanningSectionMenu />
        <section aria-labelledby="activity-designs-title">
          <h2
            id="activity-designs-title"
            className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Activity Designs
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Scan planning contexts, find the one you need, and see how many Activities belong to each one.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-start">
          <section aria-labelledby="activity-designs-table-title" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 id="activity-designs-table-title" className="font-heading text-lg font-medium">
                  Activity Designs
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {initialActivityDesigns.length} loaded {initialActivityDesigns.length === 1 ? "design" : "designs"}.
                </p>
              </div>
            </div>
            <ActivityDesignsWorkspace activityDesigns={initialActivityDesigns} />
          </section>

          <Card>
            <CardHeader>
              <CardTitle id="create-activity-design-title">
                Create an Activity Design
              </CardTitle>
              <CardDescription>
                Start with the identifier your office already uses. The number is stored consistently for future lookups.
              </CardDescription>
            </CardHeader>
            <ActivityDesignForm />
          </Card>
        </div>
      </main>
    </div>
  );
}
