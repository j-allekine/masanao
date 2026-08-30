import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "better-auth/crypto";

import { GET as activityDesignGet } from "@/app/api/activity-designs/[id]/route";
import { POST as activitiesPost } from "@/app/api/activity-designs/[id]/activities/route";
import { POST as mealSchedulesPost } from "@/app/api/activity-designs/[id]/activities/[activityId]/meal-schedules/route";
import { POST as activityDesignsPost } from "@/app/api/activity-designs/route";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { prisma } from "@/prisma/client";

const staffPassword = "correct-horse-battery-staple";
const validActivityDesign = {
  activityDesignNo: "AD-2026-018",
  fiscalYear: 2026,
  title: "Municipal Nutrition Month",
  officeName: "Municipal Social Welfare and Development Office",
};
const validActivity = {
  name: "Community Feeding",
  scheduledDate: "2026-09-01",
};
const validMealSchedule = {
  label: "Lunch",
  mealTime: "12:00",
};

async function createStaffAccount() {
  await prisma.user.create({
    data: {
      id: "staff-user",
      name: "Kitchen Staff",
      email: "kitchen.staff@internal.masanao",
      username: "kitchen.staff",
      accounts: {
        create: {
          id: "staff-credential-account",
          issuer: "local:credential",
          accountId: "staff-user",
          providerId: "credential",
          password: await hashPassword(staffPassword),
        },
      },
    },
  });
}

async function cookieForStaff() {
  const response = await authPost(
    new Request("http://localhost:3000/api/auth/sign-in/username", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        username: "kitchen.staff",
        password: staffPassword,
      }),
    }),
  );

  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

function request(
  url: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
  cookie = "",
) {
  return new Request(`http://localhost:3000${url}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function routeParams(id: string, activityId: string) {
  return { params: Promise.resolve({ id, activityId }) };
}

async function createActivityScenario() {
  await createStaffAccount();
  const cookie = await cookieForStaff();
  const designResponse = await activityDesignsPost(
    request("/api/activity-designs", "POST", validActivityDesign, cookie),
  );
  const activityDesign = (await designResponse.json()).activityDesign;
  const activityResponse = await activitiesPost(
    request(
      `/api/activity-designs/${activityDesign.id}/activities`,
      "POST",
      validActivity,
      cookie,
    ),
    { params: Promise.resolve({ id: activityDesign.id }) },
  );

  return {
    cookie,
    activityDesign,
    activity: (await activityResponse.json()).activity,
  };
}

describe("Meal Schedule API", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.mealSchedule.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.activityDesign.deleteMany();
    await prisma.user.deleteMany();
  });

  it("creates multiple Meal Schedules and lists them under the Activity after rereading", async () => {
    const { cookie, activityDesign, activity } =
      await createActivityScenario();

    const lunchResponse = await mealSchedulesPost(
      request(
        `/api/activity-designs/${activityDesign.id}/activities/${activity.id}/meal-schedules`,
        "POST",
        { label: "  Lunch  ", mealTime: "12:00", plannedServings: 120 },
        cookie,
      ),
      routeParams(activityDesign.id, activity.id),
    );
    const snackResponse = await mealSchedulesPost(
      request(
        `/api/activity-designs/${activityDesign.id}/activities/${activity.id}/meal-schedules`,
        "POST",
        { label: "Snack", mealTime: "15:30" },
        cookie,
      ),
      routeParams(activityDesign.id, activity.id),
    );

    expect(lunchResponse.status).toBe(201);
    expect(await lunchResponse.json()).toMatchObject({
      mealSchedule: {
        activityId: activity.id,
        label: "Lunch",
        mealTime: "12:00",
        plannedServings: 120,
      },
    });
    expect(snackResponse.status).toBe(201);
    expect(await snackResponse.json()).toMatchObject({
      mealSchedule: {
        activityId: activity.id,
        label: "Snack",
        mealTime: "15:30",
        plannedServings: null,
      },
    });

    const rereadResponse = await activityDesignGet(
      request(
        `/api/activity-designs/${activityDesign.id}`,
        "GET",
        undefined,
        cookie,
      ),
      { params: Promise.resolve({ id: activityDesign.id }) },
    );

    expect(rereadResponse.status).toBe(200);
    expect(await rereadResponse.json()).toMatchObject({
      activityDesign: {
        activities: [
          {
            id: activity.id,
            mealScheduleCount: 2,
            mealSchedules: [
              {
                activityId: activity.id,
                label: "Lunch",
                mealTime: "12:00",
                plannedServings: 120,
              },
              {
                activityId: activity.id,
                label: "Snack",
                mealTime: "15:30",
                plannedServings: null,
              },
            ],
          },
        ],
      },
    });
  });

  it("keeps an Activity without Meal Schedules valid and presents an empty collection", async () => {
    const { cookie, activityDesign, activity } =
      await createActivityScenario();

    const response = await activityDesignGet(
      request(
        `/api/activity-designs/${activityDesign.id}`,
        "GET",
        undefined,
        cookie,
      ),
      { params: Promise.resolve({ id: activityDesign.id }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      activityDesign: {
        activities: [
          {
            id: activity.id,
            mealScheduleCount: 0,
            mealSchedules: [],
          },
        ],
      },
    });
  });

  it.each([
    ["a blank label", { label: " " }, "label"],
    ["an invalid time", { mealTime: "12:60" }, "mealTime"],
    ["a time with seconds", { mealTime: "12:00:00" }, "mealTime"],
    ["negative planned servings", { plannedServings: -1 }, "plannedServings"],
    ["an overlong label", { label: "x".repeat(101) }, "label"],
    [
      "planned servings outside the Prisma Int range",
      { plannedServings: 2_147_483_648 },
      "plannedServings",
    ],
  ] as const)(
    "rejects %s without creating a Meal Schedule",
    async (_description, invalidFields, expectedField) => {
      const { cookie, activityDesign, activity } =
        await createActivityScenario();

      const response = await mealSchedulesPost(
        request(
          `/api/activity-designs/${activityDesign.id}/activities/${activity.id}/meal-schedules`,
          "POST",
          { ...validMealSchedule, ...invalidFields },
          cookie,
        ),
        routeParams(activityDesign.id, activity.id),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: "Please correct the highlighted Meal Schedule fields.",
        fields: { [expectedField]: expect.any(Array) },
      });
      expect(await prisma.mealSchedule.count()).toBe(0);
    },
  );

  it("rejects missing or mismatched parent Activities before persistence", async () => {
    const { cookie, activityDesign, activity } =
      await createActivityScenario();

    const missingActivityResponse = await mealSchedulesPost(
      request(
        `/api/activity-designs/${activityDesign.id}/activities/missing-activity/meal-schedules`,
        "POST",
        validMealSchedule,
        cookie,
      ),
      routeParams(activityDesign.id, "missing-activity"),
    );

    expect(missingActivityResponse.status).toBe(404);
    expect(await missingActivityResponse.json()).toEqual({
      error: "The Activity could not be found.",
      fields: {},
    });

    const otherDesignResponse = await activityDesignsPost(
      request(
        "/api/activity-designs",
        "POST",
        { ...validActivityDesign, activityDesignNo: "AD-2026-019" },
        cookie,
      ),
    );
    const otherDesign = (await otherDesignResponse.json()).activityDesign;
    const mismatchedParentResponse = await mealSchedulesPost(
      request(
        `/api/activity-designs/${otherDesign.id}/activities/${activity.id}/meal-schedules`,
        "POST",
        validMealSchedule,
        cookie,
      ),
      routeParams(otherDesign.id, activity.id),
    );

    expect(mismatchedParentResponse.status).toBe(404);
    expect(await prisma.mealSchedule.count()).toBe(0);
  });

  it("requires authentication for Meal Schedule creation", async () => {
    const response = await mealSchedulesPost(
      request(
        "/api/activity-designs/missing-design/activities/missing-activity/meal-schedules",
        "POST",
        validMealSchedule,
      ),
      routeParams("missing-design", "missing-activity"),
    );

    expect(response.status).toBe(401);
    expect(await prisma.mealSchedule.count()).toBe(0);
  });
});
