import { SidebarTrigger } from "@/components/ui/sidebar";

import ActivityDesignsWorkspace from "./activity-designs-workspace";
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
            <p className="truncate text-xs text-muted-foreground">Planning</p>
            <p className="truncate text-sm font-medium">Activity designs</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Planning workspace</div>
      </header>

      <main className="mx-auto flex w-full max-w-[72rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PlanningSectionMenu />
        <ActivityDesignsWorkspace activityDesigns={initialActivityDesigns} />
      </main>
    </div>
  );
}
