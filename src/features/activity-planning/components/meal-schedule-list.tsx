import { Clock3, Utensils } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import type { MealScheduleListItem } from "../types";

function MealScheduleListItemRow({
  mealSchedule,
}: {
  mealSchedule: MealScheduleListItem;
}) {
  return (
    <li className="rounded-md border bg-background px-3 py-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{mealSchedule.label}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 aria-hidden="true" />
            <span>{mealSchedule.mealTime}</span>
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {mealSchedule.plannedServings === null
            ? "Servings not planned"
            : `${mealSchedule.plannedServings.toLocaleString("en-PH")} planned servings`}
        </p>
      </div>
    </li>
  );
}

export default function MealScheduleList({
  mealSchedules,
}: {
  mealSchedules: MealScheduleListItem[];
}) {
  if (mealSchedules.length === 0) {
    return (
      <Empty className="min-h-0 border-0 px-3 py-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Utensils aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Meal Schedules yet</EmptyTitle>
          <EmptyDescription>
            Add a named meal occasion and local time when the plan is ready.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ol aria-label="Meal Schedules" className="flex flex-col gap-2">
      {mealSchedules.map((mealSchedule) => (
        <MealScheduleListItemRow
          key={mealSchedule.id}
          mealSchedule={mealSchedule}
        />
      ))}
    </ol>
  );
}
