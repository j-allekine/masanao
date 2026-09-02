import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import ActivityDesignsWorkspace from "./activity-designs-workspace";
import type { ActivityDesignListItem } from "../types";

export default function ActivityDesignsContent({
  initialActivityDesigns,
}: {
  initialActivityDesigns: ActivityDesignListItem[];
}) {
  return (
    <div className="flex min-h-svh flex-col bg-card">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-8" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-heading-3 font-semibold">Planning</p>
            <p className="truncate text-body-sm text-muted-foreground">
              Plan upcoming municipal activities.
            </p>
          </div>
        </div>
      </header>

      <div className="flex w-full flex-1 flex-col px-4 py-6 sm:px-6">
        <ActivityDesignsWorkspace activityDesigns={initialActivityDesigns} />
      </div>
    </div>
  );
}
