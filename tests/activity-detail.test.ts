import { beforeEach, describe, expect, it } from "vitest";

import { getActivity } from "@/features/activity-planning/server";
import { prisma } from "@/prisma/client";

const design = {
  id: "activity-detail-design",
  activityDesignNo: "AD-2026-ACTIVITY",
  fiscalYear: 2026,
  title: "Municipal Feeding Plan",
};

const activity = {
  id: "activity-detail-activity",
  activityDesignId: design.id,
  name: "Nutrition Month Launch",
  officeName: "Municipal Health Office",
  particulars: "Launch program for Nutrition Month",
  scheduledDate: new Date("2026-08-17T00:00:00.000Z"),
  venue: "Municipal Covered Court",
  plannedParticipantCount: 120,
  plannedBudgetCentavos: BigInt(125000),
};

beforeEach(async () => {
  await prisma.mealSchedule.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.activityDesign.deleteMany();
});

describe("Activity detail public read", () => {
  it("returns its parent context and direct Meal Schedules in time then label order", async () => {
    await prisma.activityDesign.create({ data: design });
    await prisma.activity.create({ data: activity });
    await prisma.mealSchedule.createMany({
      data: [
        {
          id: "activity-detail-lunch",
          activityId: activity.id,
          label: "Lunch",
          mealTime: "12:00",
          plannedServings: 120,
        },
        {
          id: "activity-detail-breakfast-z",
          activityId: activity.id,
          label: "Zucchini breakfast",
          mealTime: "07:30",
        },
        {
          id: "activity-detail-breakfast-a",
          activityId: activity.id,
          label: "Apple breakfast",
          mealTime: "07:30",
          plannedServings: 100,
        },
      ],
    });

    await expect(getActivity(design.id, activity.id)).resolves.toEqual({
      id: activity.id,
      activityDesignId: design.id,
      name: activity.name,
      officeName: activity.officeName,
      particulars: activity.particulars,
      scheduledDate: "2026-08-17T00:00:00.000Z",
      venue: activity.venue,
      plannedParticipantCount: 120,
      plannedBudgetCentavos: "125000",
      mealScheduleCount: 3,
      activityDesign: {
        id: design.id,
        activityDesignNo: design.activityDesignNo,
        title: design.title,
      },
      mealSchedules: [
        {
          id: "activity-detail-breakfast-a",
          activityId: activity.id,
          label: "Apple breakfast",
          mealTime: "07:30",
          plannedServings: 100,
        },
        {
          id: "activity-detail-breakfast-z",
          activityId: activity.id,
          label: "Zucchini breakfast",
          mealTime: "07:30",
          plannedServings: null,
        },
        {
          id: "activity-detail-lunch",
          activityId: activity.id,
          label: "Lunch",
          mealTime: "12:00",
          plannedServings: 120,
        },
      ],
    });
  });

  it("returns an empty direct-Meal Schedule collection when none have been recorded", async () => {
    await prisma.activityDesign.create({ data: design });
    await prisma.activity.create({
      data: {
        ...activity,
        particulars: null,
        venue: null,
        plannedParticipantCount: null,
        plannedBudgetCentavos: null,
      },
    });

    await expect(getActivity(design.id, activity.id)).resolves.toMatchObject({
      id: activity.id,
      mealScheduleCount: 0,
      mealSchedules: [],
    });
  });

  it("returns no record for a missing Activity or a mismatched Activity Design", async () => {
    await prisma.activityDesign.create({ data: design });
    await prisma.activityDesign.create({
      data: {
        id: "other-activity-detail-design",
        activityDesignNo: "AD-2026-OTHER",
        fiscalYear: 2026,
        title: "Other planning context",
      },
    });
    await prisma.activity.create({ data: activity });

    await expect(getActivity(design.id, "missing-activity")).resolves.toBeNull();
    await expect(
      getActivity("other-activity-detail-design", activity.id),
    ).resolves.toBeNull();
  });
});
