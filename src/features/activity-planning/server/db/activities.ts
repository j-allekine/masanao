import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { ActivityInput } from "../../schemas/activity";
import type {
  ActivityDesignDetail,
  ActivityListItem,
  ActivityWorkspaceListItem,
} from "../../types";
import {
  mealScheduleOrderBy,
  mealScheduleSelect,
  toMealScheduleListItem,
} from "./meal-schedules";

const activitySelect = {
  id: true,
  activityDesignId: true,
  name: true,
  officeName: true,
  particulars: true,
  scheduledDate: true,
  venue: true,
  plannedParticipantCount: true,
  plannedBudgetCentavos: true,
  _count: {
    select: { mealSchedules: true },
  },
  mealSchedules: {
    select: mealScheduleSelect,
    orderBy: mealScheduleOrderBy,
  },
} as const;

const activityWorkspaceListSelect = {
  id: true,
  activityDesignId: true,
  name: true,
  officeName: true,
  particulars: true,
  scheduledDate: true,
  venue: true,
  plannedParticipantCount: true,
  plannedBudgetCentavos: true,
  activityDesign: {
    select: { title: true },
  },
  _count: {
    select: { mealSchedules: true },
  },
} as const;

const activityWorkspaceListOrderBy = [
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.ActivityOrderByWithRelationInput[];

const activityOrderBy = [
  { scheduledDate: "asc" },
  { name: "asc" },
] satisfies Prisma.ActivityOrderByWithRelationInput[];

const activityDesignDetailSelect = {
  id: true,
  activityDesignNo: true,
  fiscalYear: true,
  title: true,
  aipReferenceCode: true,
  _count: {
    select: { activities: true },
  },
  activities: {
    select: activitySelect,
    orderBy: activityOrderBy,
  },
} as const;

export function isForeignKeyConstraintViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

export function isRecordNotFound(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

export function isRestrictiveRelationViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2003" || error.code === "P2014")
  );
}

function toActivityListItem(activity: {
  id: string;
  activityDesignId: string;
  name: string;
  officeName: string;
  particulars: string | null;
  scheduledDate: Date;
  venue: string | null;
  plannedParticipantCount: number | null;
  plannedBudgetCentavos: bigint | null;
  _count: { mealSchedules: number };
  mealSchedules: Array<Parameters<typeof toMealScheduleListItem>[0]>;
}): ActivityListItem {
  return {
    id: activity.id,
    activityDesignId: activity.activityDesignId,
    name: activity.name,
    officeName: activity.officeName,
    particulars: activity.particulars,
    scheduledDate: activity.scheduledDate.toISOString(),
    venue: activity.venue,
    plannedParticipantCount: activity.plannedParticipantCount,
    plannedBudgetCentavos:
      activity.plannedBudgetCentavos?.toString() ?? null,
    mealScheduleCount: activity._count.mealSchedules,
    mealSchedules: activity.mealSchedules.map(toMealScheduleListItem),
  };
}

function toActivityWorkspaceListItem(activity: {
  id: string;
  activityDesignId: string;
  name: string;
  officeName: string;
  particulars: string | null;
  scheduledDate: Date;
  venue: string | null;
  plannedParticipantCount: number | null;
  plannedBudgetCentavos: bigint | null;
  activityDesign: { title: string };
  _count: { mealSchedules: number };
}): ActivityWorkspaceListItem {
  return {
    id: activity.id,
    activityDesignId: activity.activityDesignId,
    name: activity.name,
    officeName: activity.officeName,
    particulars: activity.particulars,
    scheduledDate: activity.scheduledDate.toISOString(),
    venue: activity.venue,
    plannedParticipantCount: activity.plannedParticipantCount,
    plannedBudgetCentavos:
      activity.plannedBudgetCentavos?.toString() ?? null,
    activityDesignTitle: activity.activityDesign.title,
    mealScheduleCount: activity._count.mealSchedules,
  };
}

function toActivityDesignDetail(activityDesign: {
  id: string;
  activityDesignNo: string;
  fiscalYear: number;
  title: string;
  aipReferenceCode: string | null;
  _count: { activities: number };
  activities: Array<Parameters<typeof toActivityListItem>[0]>;
}): ActivityDesignDetail {
  return {
    id: activityDesign.id,
    activityDesignNo: activityDesign.activityDesignNo,
    fiscalYear: activityDesign.fiscalYear,
    title: activityDesign.title,
    aipReferenceCode: activityDesign.aipReferenceCode,
    activityCount: activityDesign._count.activities,
    activities: activityDesign.activities.map(toActivityListItem),
  };
}

function dateOnlyToUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export async function getActivityDesignRecord(
  id: string,
): Promise<ActivityDesignDetail | null> {
  const activityDesign = await prisma.activityDesign.findUnique({
    where: { id },
    select: activityDesignDetailSelect,
  });

  return activityDesign ? toActivityDesignDetail(activityDesign) : null;
}

export async function listActivityWorkspaceRecords(): Promise<
  ActivityWorkspaceListItem[]
> {
  const activities = await prisma.activity.findMany({
    select: activityWorkspaceListSelect,
    orderBy: activityWorkspaceListOrderBy,
  });

  return activities.map(toActivityWorkspaceListItem);
}

export async function createActivityRecord(
  activityDesignId: string,
  input: ActivityInput,
): Promise<ActivityListItem | null> {
  const parent = await prisma.activityDesign.findUnique({
    where: { id: activityDesignId },
    select: { id: true },
  });

  if (!parent) return null;

  try {
    const activity = await prisma.activity.create({
      data: {
        id: crypto.randomUUID(),
        activityDesignId,
        name: input.name,
        officeName: input.officeName,
        particulars: input.particulars ?? null,
        scheduledDate: dateOnlyToUtcDate(input.scheduledDate),
        venue: input.venue ?? null,
        plannedParticipantCount: input.plannedParticipantCount ?? null,
        plannedBudgetCentavos: input.plannedBudgetPesos ?? null,
      },
      select: activitySelect,
    });

    return toActivityListItem(activity);
  } catch (error) {
    if (isForeignKeyConstraintViolation(error)) return null;
    throw error;
  }
}

export async function updateActivityRecord(
  activityDesignId: string,
  activityId: string,
  input: ActivityInput,
): Promise<ActivityListItem | null> {
  const existingActivity = await prisma.activity.findFirst({
    where: { id: activityId, activityDesignId },
    select: { id: true },
  });

  if (!existingActivity) return null;

  try {
    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: {
        name: input.name,
        officeName: input.officeName,
        particulars: input.particulars ?? null,
        scheduledDate: dateOnlyToUtcDate(input.scheduledDate),
        venue: input.venue ?? null,
        plannedParticipantCount: input.plannedParticipantCount ?? null,
        plannedBudgetCentavos: input.plannedBudgetPesos ?? null,
      },
      select: activitySelect,
    });

    return toActivityListItem(activity);
  } catch (error) {
    if (isRecordNotFound(error)) return null;
    throw error;
  }
}

export async function deleteActivityRecord(
  activityDesignId: string,
  activityId: string,
) {
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, activityDesignId },
    select: {
      _count: { select: { mealSchedules: true } },
    },
  });

  if (!activity) return null;

  if (activity._count.mealSchedules > 0) {
    return {
      deleted: false as const,
      mealScheduleCount: activity._count.mealSchedules,
    };
  }

  try {
    await prisma.activity.delete({ where: { id: activityId } });
  } catch (error) {
    if (isRecordNotFound(error)) return null;

    if (isRestrictiveRelationViolation(error)) {
      const currentMealScheduleCount = await prisma.mealSchedule.count({
        where: { activityId },
      });

      return {
        deleted: false as const,
        mealScheduleCount: currentMealScheduleCount,
      };
    }

    throw error;
  }

  return { deleted: true as const };
}
