import { Bell, CalendarDays } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

import ActivityDesignsWorkspace from "./activity-designs-workspace";
import type { ActivityDesignListItem } from "../types";

export default function ActivityDesignsContent({
  initialActivityDesigns,
  user,
}: {
  initialActivityDesigns: ActivityDesignListItem[];
  user: { name: string; username: string };
}) {
  return (
    <div className="flex min-h-svh flex-col bg-card">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <CalendarDays className="shrink-0" aria-hidden="true" />
          <p className="truncate text-heading-3 font-semibold">Planning</p>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <p className="truncate text-body-sm text-muted-foreground">Planning workspace</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
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
          <Avatar className="size-8 bg-primary/10 text-primary after:border-primary/10">
            <AvatarFallback className="bg-primary/10 text-label font-medium text-primary">
              {user.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase() || "MS"}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="flex w-full flex-1 flex-col px-4 py-6 sm:px-6">
        <ActivityDesignsWorkspace activityDesigns={initialActivityDesigns} />
      </div>
    </div>
  );
}
