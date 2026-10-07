import { beforeEach, describe, expect, it } from "vitest";

import { getActivityDesign } from "@/features/activity-planning/server";
import { prisma } from "@/prisma/client";

const design = {
  id: "activity-design-detail",
  activityDesignNo: "AD-2026-DETAIL",
  fiscalYear: 2026,
  title: "Municipal Nutrition Month",
  aipReferenceCode: "AIP-2026-018",
};

beforeEach(async () => {
  await prisma.mealSchedule.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.activityDesign.deleteMany();
});

describe("Activity Design detail public read", () => {
  it("returns the requested Activity Design with only its direct Activities and their counts", async () => {
    await prisma.activityDesign.create({ data: design });
    await prisma.activityDesign.create({
      data: {
        id: "other-activity-design-detail",
        activityDesignNo: "AD-2026-OTHER",
        fiscalYear: 2026,
        title: "Other planning context",
      },
    });
    await prisma.activity.createMany({
      data: [
        {
          id: "older-activity-detail",
          activityDesignId: design.id,
          name: "Older feeding activity",
          officeName: "Municipal Social Welfare Office",
          scheduledDate: new Date("2026-08-16T00:00:00.000Z"),
          createdAt: new Date("2026-08-16T00:00:00.000Z"),
        },
        {
          id: "other-activity-detail",
          activityDesignId: "other-activity-design-detail",
          name: "Other design activity",
          officeName: "Other Office",
          scheduledDate: new Date("2026-08-18T00:00:00.000Z"),
        },
      ],
    });
    const newerActivity = await prisma.activity.create({
      data: {
        id: "newer-activity-detail",
        activityDesignId: design.id,
        name: "Newer feeding activity",
        officeName: "Municipal Health Office",
        particulars: "Nutrition Month launch",
        scheduledDate: new Date("2026-08-17T00:00:00.000Z"),
        createdAt: new Date("2026-08-17T00:00:00.000Z"),
        venue: "Municipal Covered Court",
        plannedParticipantCount: 120,
        plannedBudgetCentavos: BigInt(125000),
      },
    });
    await prisma.mealSchedule.createMany({
      data: [
        {
          id: "detail-breakfast",
          activityId: newerActivity.id,
          label: "Breakfast",
          mealTime: "07:30",
        },
        {
          id: "detail-lunch",
          activityId: newerActivity.id,
          label: "Lunch",
          mealTime: "12:00",
        },
      ],
    });

    await expect(getActivityDesign(design.id)).resolves.toEqual({
      ...design,
      activityCount: 2,
      activities: [
        expect.objectContaining({
          id: newerActivity.id,
          activityDesignId: design.id,
          name: "Newer feeding activity",
          officeName: "Municipal Health Office",
          scheduledDate: "2026-08-17T00:00:00.000Z",
          mealScheduleCount: 2,
        }),
        expect.objectContaining({
          id: "older-activity-detail",
          activityDesignId: design.id,
          name: "Older feeding activity",
          mealScheduleCount: 0,
        }),
      ],
    });
  });

  it("returns an empty direct-Activity collection for a design without Activities", async () => {
    await prisma.activityDesign.create({ data: design });

    await expect(getActivityDesign(design.id)).resolves.toEqual({
      ...design,
      activityCount: 0,
      activities: [],
    });
  });

  it("returns no record for an unknown Activity Design", async () => {
    await expect(getActivityDesign("missing-activity-design")).resolves.toBeNull();
  });
});
