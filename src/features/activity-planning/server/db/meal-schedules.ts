import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { MealScheduleInput } from "../../schemas/meal-schedule";
import type { MealScheduleListItem } from "../../types";

export const mealScheduleSelect = {
  id: true,
  activityId: true,
  label: true,
  mealTime: true,
  plannedServings: true,
} as const;

export const mealScheduleOrderBy = [
  { mealTime: "asc" },
  { label: "asc" },
] satisfies Prisma.MealScheduleOrderByWithRelationInput[];

export function toMealScheduleListItem(schedule: {
  id: string;
  activityId: string;
  label: string;
  mealTime: string;
  plannedServings: number | null;
}): MealScheduleListItem {
  return {
    id: schedule.id,
    activityId: schedule.activityId,
    label: schedule.label,
    mealTime: schedule.mealTime,
    plannedServings: schedule.plannedServings,
  };
}

function isForeignKeyConstraintViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

export async function createMealScheduleRecord(
  activityDesignId: string,
  activityId: string,
  input: MealScheduleInput,
): Promise<MealScheduleListItem | null> {
  const parent = await prisma.activity.findFirst({
    where: { id: activityId, activityDesignId },
    select: { id: true },
  });

  if (!parent) return null;

  try {
    const mealSchedule = await prisma.mealSchedule.create({
      data: {
        id: crypto.randomUUID(),
        activityId,
        label: input.label,
        mealTime: input.mealTime,
        plannedServings: input.plannedServings ?? null,
      },
      select: mealScheduleSelect,
    });

    return toMealScheduleListItem(mealSchedule);
  } catch (error) {
    if (isForeignKeyConstraintViolation(error)) return null;
    throw error;
  }
}
