import "server-only";

import { prisma } from "@/prisma/client";

export type ActivityDesignListItem = {
  id: string;
  activityDesignNo: string;
  fiscalYear: number;
  title: string;
  officeName: string;
  aipReferenceCode: string | null;
  activityCount: number;
};

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

export async function listActivityDesigns(): Promise<ActivityDesignListItem[]> {
  const activityDesigns = await prisma.activityDesign.findMany({
    select: activityDesignListSelect,
    orderBy: [{ fiscalYear: "desc" }, { activityDesignNo: "asc" }],
  });

  return activityDesigns.map((activityDesign) => ({
    id: activityDesign.id,
    activityDesignNo: activityDesign.activityDesignNo,
    fiscalYear: activityDesign.fiscalYear,
    title: activityDesign.title,
    officeName: activityDesign.officeName,
    aipReferenceCode: activityDesign.aipReferenceCode,
    activityCount: activityDesign._count.activities,
  }));
}
