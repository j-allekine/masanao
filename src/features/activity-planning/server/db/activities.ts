import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";
import { findActiveOfficeName } from "@/features/master-data/server/db/offices";

import type { ActivityInput, ActivityUpdateInput } from "../../schemas/activity";
import type {
  ActivityDetailItem,
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

const activityDetailSelect = {
  ...activitySelect,
  activityDesign: {
    select: {
      id: true,
      activityDesignNo: true,
      title: true,
    },
  },
} satisfies Prisma.ActivitySelect;

const activityWorkspaceListOrderBy = [
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.ActivityOrderByWithRelationInput[];

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

function dateOnlyToUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
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

export async function getActivityRecord(
  activityDesignId: string,
  activityId: string,
): Promise<ActivityDetailItem | null> {
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, activityDesignId },
    select: activityDetailSelect,
  });

  if (!activity) return null;

  return {
    ...toActivityListItem(activity),
    activityDesign: activity.activityDesign,
  };
}

type ActivityWriteResult = ActivityListItem | "invalid-office" | null;

function activityWriteData(input: ActivityInput | ActivityUpdateInput) {
  return {
    name: input.name,
    particulars: input.particulars ?? null,
    scheduledDate: dateOnlyToUtcDate(input.scheduledDate),
    venue: input.venue ?? null,
    plannedParticipantCount: input.plannedParticipantCount ?? null,
    plannedBudgetCentavos: input.plannedBudgetPesos ?? null,
  };
}

export async function createActivityRecord(
  activityDesignId: string,
  input: ActivityInput,
): Promise<ActivityWriteResult> {
  try {
    return await prisma.$transaction(async (db) => {
      const parent = await db.activityDesign.findUnique({
        where: { id: activityDesignId },
        select: { id: true },
      });
      if (!parent) return null;

      const office = await findActiveOfficeName(db, input.officeId);
      if (!office) return "invalid-office";

      const activity = await db.activity.create({
        data: {
          ...activityWriteData(input),
          id: crypto.randomUUID(),
          activityDesignId,
          officeName: office.name,
        },
        select: activitySelect,
      });

      return toActivityListItem(activity);
    });
  } catch (error) {
    if (isForeignKeyConstraintViolation(error)) return null;
    throw error;
  }
}

export async function updateActivityRecord(
  activityDesignId: string,
  activityId: string,
  input: ActivityUpdateInput,
): Promise<ActivityWriteResult> {
  try {
    return await prisma.$transaction(async (db) => {
      const existing = await db.activity.findUnique({
        where: { id: activityId, activityDesignId },
        select: { officeName: true },
      });
      if (!existing) return null;

      const office = input.officeId === null
        ? { name: existing.officeName }
        : await findActiveOfficeName(db, input.officeId);
      if (!office) return "invalid-office";

      const activity = await db.activity.update({
        where: { id: activityId, activityDesignId },
        data: { ...activityWriteData(input), officeName: office.name },
        select: activitySelect,
      });

      return toActivityListItem(activity);
    });
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
