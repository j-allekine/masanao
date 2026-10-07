import { beforeEach, describe, expect, it } from "vitest";

import { getMealSchedule } from "@/features/activity-planning/server";
import { prisma } from "@/prisma/client";

const design = {
  id: "meal-schedule-detail-design",
  activityDesignNo: "AD-2026-MEAL-SCHEDULE",
  fiscalYear: 2026,
  title: "Municipal Feeding Plan",
};

const activity = {
  id: "meal-schedule-detail-activity",
  activityDesignId: design.id,
  name: "Nutrition Month Launch",
  officeName: "Municipal Health Office",
  scheduledDate: new Date("2026-08-17T00:00:00.000Z"),
  venue: "Municipal Covered Court",
};

beforeEach(async () => {
  await prisma.mealSchedule.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.activityDesign.deleteMany();
});

describe("Meal Schedule detail public read", () => {
  it("returns the requested Meal Schedule with only its Activity and Activity Design context", async () => {
    await prisma.activityDesign.create({ data: design });
    await prisma.activity.create({ data: activity });
    await prisma.mealSchedule.create({
      data: {
        id: "meal-schedule-detail-lunch",
        activityId: activity.id,
        label: "Lunch",
        mealTime: "12:00",
        plannedServings: 120,
      },
    });

    await expect(
      getMealSchedule(
        design.id,
        activity.id,
        "meal-schedule-detail-lunch",
      ),
    ).resolves.toEqual({
      id: "meal-schedule-detail-lunch",
      activityId: activity.id,
      label: "Lunch",
      mealTime: "12:00",
      plannedServings: 120,
      activity: {
        id: activity.id,
        name: activity.name,
        officeName: activity.officeName,
        venue: activity.venue,
        activityDesign: {
          id: design.id,
          activityDesignNo: design.activityDesignNo,
          title: design.title,
        },
      },
    });
  });

  it("preserves absent optional Activity and Meal Schedule values", async () => {
    await prisma.activityDesign.create({ data: design });
    await prisma.activity.create({
      data: { ...activity, venue: null },
    });
    await prisma.mealSchedule.create({
      data: {
        id: "meal-schedule-detail-optional-values",
        activityId: activity.id,
        label: "Afternoon Snack",
        mealTime: "15:30",
        plannedServings: null,
      },
    });

    await expect(
      getMealSchedule(
        design.id,
        activity.id,
        "meal-schedule-detail-optional-values",
      ),
    ).resolves.toMatchObject({
      plannedServings: null,
      activity: { venue: null },
    });
  });

  it("returns no record for a missing Meal Schedule or every mismatched hierarchy parent", async () => {
    const otherDesign = {
      id: "other-meal-schedule-detail-design",
      activityDesignNo: "AD-2026-OTHER",
      fiscalYear: 2026,
      title: "Other planning context",
    };
    const otherActivity = {
      id: "other-meal-schedule-detail-activity",
      activityDesignId: otherDesign.id,
      name: "Other Activity",
      officeName: "Other Office",
      scheduledDate: new Date("2026-08-18T00:00:00.000Z"),
    };
    const siblingActivity = {
      id: "sibling-meal-schedule-detail-activity",
      activityDesignId: design.id,
      name: "Sibling Activity",
      officeName: "Municipal Health Office",
      scheduledDate: new Date("2026-08-19T00:00:00.000Z"),
    };

    await prisma.activityDesign.createMany({ data: [design, otherDesign] });
    await prisma.activity.createMany({
      data: [activity, otherActivity, siblingActivity],
    });
    await prisma.mealSchedule.createMany({
      data: [
        {
          id: "meal-schedule-detail-lunch",
          activityId: activity.id,
          label: "Lunch",
          mealTime: "12:00",
        },
        {
          id: "meal-schedule-detail-sibling",
          activityId: siblingActivity.id,
          label: "Snack",
          mealTime: "15:30",
        },
      ],
    });

    await expect(
      getMealSchedule(design.id, activity.id, "missing-meal-schedule"),
    ).resolves.toBeNull();
    await expect(
      getMealSchedule(otherDesign.id, activity.id, "meal-schedule-detail-lunch"),
    ).resolves.toBeNull();
    await expect(
      getMealSchedule(design.id, otherActivity.id, "meal-schedule-detail-lunch"),
    ).resolves.toBeNull();
    await expect(
      getMealSchedule(
        design.id,
        activity.id,
        "meal-schedule-detail-sibling",
      ),
    ).resolves.toBeNull();
  });
});
