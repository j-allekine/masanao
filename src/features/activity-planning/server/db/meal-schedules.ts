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

function isRecordNotFound(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

function isRestrictiveRelationViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2003" || error.code === "P2014")
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

export async function updateMealScheduleRecord(
  activityDesignId: string,
  activityId: string,
  mealScheduleId: string,
  input: MealScheduleInput,
): Promise<MealScheduleListItem | null> {
  const existingMealSchedule = await prisma.mealSchedule.findFirst({
    where: {
      id: mealScheduleId,
      activityId,
      activity: { activityDesignId },
    },
    select: { id: true },
  });

  if (!existingMealSchedule) return null;

  try {
    const mealSchedule = await prisma.mealSchedule.update({
      where: { id: mealScheduleId },
      data: {
        label: input.label,
        mealTime: input.mealTime,
        plannedServings: input.plannedServings ?? null,
      },
      select: mealScheduleSelect,
    });

    return toMealScheduleListItem(mealSchedule);
  } catch (error) {
    if (isRecordNotFound(error)) return null;
    throw error;
  }
}

export async function deleteMealScheduleRecord(
  activityDesignId: string,
  activityId: string,
  mealScheduleId: string,
) {
  const existingMealSchedule = await prisma.mealSchedule.findFirst({
    where: {
      id: mealScheduleId,
      activityId,
      activity: { activityDesignId },
    },
    select: { id: true },
  });

  if (!existingMealSchedule) return null;

  try {
    await prisma.mealSchedule.delete({ where: { id: mealScheduleId } });
  } catch (error) {
    if (isRecordNotFound(error)) return null;
    if (isRestrictiveRelationViolation(error)) {
      return { deleted: false as const };
    }
    throw error;
  }

  return { deleted: true as const };
}
