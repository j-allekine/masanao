import { CalendarDays, ClipboardCheck } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import type { ActivityListItem } from "../types";

function formatScheduledDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function ActivityList({
  activities,
}: {
  activities: ActivityListItem[];
}) {
  if (activities.length === 0) {
    return (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardCheck aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Activities yet</EmptyTitle>
          <EmptyDescription>
            Add the first undertaking to this Activity Design. Meal Schedules
            can be added later as planning progresses.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul aria-label="Activities" className="flex flex-col gap-3">
      {activities.map((activity) => (
        <li
          key={activity.id}
          className="rounded-lg border bg-background p-4 transition-colors hover:bg-muted/40"
        >
          <article className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold">{activity.name}</h3>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays aria-hidden="true" />
                <span>{formatScheduledDate(activity.scheduledDate)}</span>
              </p>
            </div>
            <p className="shrink-0 text-sm text-muted-foreground">
              {activity.mealScheduleCount === 0
                ? "No Meal Schedules yet"
                : `${activity.mealScheduleCount} Meal Schedule${activity.mealScheduleCount === 1 ? "" : "s"}`}
            </p>
          </article>
          {activity.particulars ? (
            <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
              {activity.particulars}
            </p>
          ) : null}
          {activity.venue ||
          activity.plannedParticipantCount !== null ||
          activity.plannedBudgetCentavos !== null ? (
            <dl className="mt-4 grid gap-3 border-t pt-3 text-sm sm:grid-cols-3">
              {activity.venue ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Venue</dt>
                  <dd className="mt-1 font-medium">{activity.venue}</dd>
                </div>
              ) : null}
              {activity.plannedParticipantCount !== null ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Planned pax</dt>
                  <dd className="mt-1 font-medium">
                    {activity.plannedParticipantCount}
                  </dd>
                </div>
              ) : null}
              {activity.plannedBudgetCentavos !== null ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Planned budget</dt>
                  <dd className="mt-1 font-medium">
                    {activity.plannedBudgetCentavos.toLocaleString("en-PH")} centavos
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
