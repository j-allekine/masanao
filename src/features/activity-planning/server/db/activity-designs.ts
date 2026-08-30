import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

import type { ActivityDesignInput } from "../../schemas/activity-design";
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
