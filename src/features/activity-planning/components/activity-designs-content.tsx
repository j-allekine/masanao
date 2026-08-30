import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";

import ActivityDesignForm from "./forms/activity-design-form";
import ActivityDesignList from "./activity-design-list";
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
        <section aria-labelledby="activity-designs-title" className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
            Plan · Municipal operations
          </p>
          <h1
            id="activity-designs-title"
            className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Activity Designs
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Set the planning context first. Activities and meal schedules can be added as the details become known.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-start">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Activity Designs</CardTitle>
              <CardDescription>
                {initialActivityDesigns.length === 0
                  ? "Your saved planning contexts will appear here."
                  : `${initialActivityDesigns.length} saved planning ${initialActivityDesigns.length === 1 ? "context" : "contexts"}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ActivityDesignList activityDesigns={initialActivityDesigns} />
            </CardContent>
          </Card>

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
