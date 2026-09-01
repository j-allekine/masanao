import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
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
          <div className="min-w-0 border-l pl-3">
            <p className="truncate text-heading-3 font-semibold">Planning</p>
            <p className="truncate text-body-sm text-muted-foreground">
              Plan upcoming municipal activities.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell aria-hidden="true" />
          <span
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-secondary"
            aria-label="Unread notifications"
          />
        </Button>
      </header>

      <div className="flex w-full flex-1 flex-col px-4 py-6 sm:px-6">
        <ActivityDesignsWorkspace activityDesigns={initialActivityDesigns} />
      </div>
    </div>
  );
}
