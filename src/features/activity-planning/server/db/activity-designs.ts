import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type {
  ActivityDesignInput,
  ActivityDesignUpdateInput,
} from "../../schemas/activity-design";
import type { ActivityDesignListItem } from "../../types";

const activityDesignListSelect = {
  id: true,
  activityDesignNo: true,
  fiscalYear: true,
  title: true,
  officeName: true,
  aipReferenceCode: true,
  _count: {
    select: { activities: true },
  },
} as const;

const activityDesignResponseSelect = {
  id: true,
  activityDesignNo: true,
  fiscalYear: true,
  title: true,
  officeName: true,
  aipReferenceCode: true,
} as const;

export function isUniqueConstraintViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
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

function toActivityDesignListItem(
  activityDesign: {
    id: string;
    activityDesignNo: string;
    fiscalYear: number;
    title: string;
    officeName: string;
    aipReferenceCode: string | null;
    _count: { activities: number };
  },
): ActivityDesignListItem {
  return {
    id: activityDesign.id,
    activityDesignNo: activityDesign.activityDesignNo,
    fiscalYear: activityDesign.fiscalYear,
    title: activityDesign.title,
    officeName: activityDesign.officeName,
    aipReferenceCode: activityDesign.aipReferenceCode,
    activityCount: activityDesign._count.activities,
  };
}

export async function listActivityDesignRecords(): Promise<
  ActivityDesignListItem[]
> {
  const activityDesigns = await prisma.activityDesign.findMany({
    select: activityDesignListSelect,
    orderBy: [{ fiscalYear: "desc" }, { activityDesignNo: "asc" }],
  });

  return activityDesigns.map(toActivityDesignListItem);
}

export async function createActivityDesignRecord(
  input: ActivityDesignInput,
): Promise<ActivityDesignListItem> {
  const activityDesign = await prisma.activityDesign.create({
    data: {
      id: crypto.randomUUID(),
      ...input,
      aipReferenceCode: input.aipReferenceCode ?? null,
    },
    select: activityDesignResponseSelect,
  });

  return {
    ...activityDesign,
    activityCount: 0,
  };
}

export async function updateActivityDesignRecord(
  id: string,
  input: ActivityDesignUpdateInput,
): Promise<ActivityDesignListItem> {
  const activityDesign = await prisma.activityDesign.update({
    where: { id },
    data: {
      ...input,
      aipReferenceCode: input.aipReferenceCode ?? null,
    },
    select: activityDesignListSelect,
  });

  return toActivityDesignListItem(activityDesign);
}

export async function deleteActivityDesignRecord(id: string) {
  const activityDesign = await prisma.activityDesign.findUnique({
    where: { id },
    select: {
      _count: { select: { activities: true } },
    },
  });

  if (!activityDesign) return null;

  if (activityDesign._count.activities > 0) {
    return {
      deleted: false as const,
      activityCount: activityDesign._count.activities,
    };
  }

  try {
    await prisma.activityDesign.delete({ where: { id } });
  } catch (error) {
    if (isRestrictiveRelationViolation(error)) {
      const currentActivityCount = await prisma.activity.count({
        where: { activityDesignId: id },
      });

      return {
        deleted: false as const,
        activityCount: currentActivityCount,
      };
    }

    throw error;
  }

  return { deleted: true as const };
}
