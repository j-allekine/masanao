import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "better-auth/crypto";

import {
  GET as activityDesignGet,
} from "@/app/api/activity-designs/[id]/route";
import {
  DELETE as activityDelete,
  PATCH as activityPatch,
} from "@/app/api/activity-designs/[id]/activities/[activityId]/route";
import {
  POST as activitiesPost,
} from "@/app/api/activity-designs/[id]/activities/route";
import { POST as activityDesignsPost } from "@/app/api/activity-designs/route";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { prisma } from "@/prisma/client";

const staffPassword = "correct-horse-battery-staple";
const validActivityDesign = {
  activityDesignNo: "AD-2026-017",
  fiscalYear: 2026,
  title: "Municipal Nutrition Month",
  officeName: "Municipal Social Welfare and Development Office",
};
const validActivity = {
  name: "Community Feeding",
  scheduledDate: "2026-09-01",
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
  method: "GET" | "POST" | "PATCH" | "DELETE",
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

async function createActivityScenario() {
  await createStaffAccount();
  const cookie = await cookieForStaff();
  const designResponse = await activityDesignsPost(
    request("/api/activity-designs", "POST", validActivityDesign, cookie),
  );
  const activityDesign = (await designResponse.json()).activityDesign;
  const createResponse = await activitiesPost(
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
    activity: (await createResponse.json()).activity,
  };
}

function routeParams(id: string, activityId: string) {
  return { params: Promise.resolve({ id, activityId }) };
}

describe("Activity edit API", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.mealSchedule.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.activityDesign.deleteMany();
    await prisma.user.deleteMany();
  });

  it("edits an Activity and returns the saved planning values after rereading", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const designResponse = await activityDesignsPost(
      request("/api/activity-designs", "POST", validActivityDesign, cookie),
    );
    const activityDesign = (await designResponse.json()).activityDesign;
    const createResponse = await activitiesPost(
      request(
        `/api/activity-designs/${activityDesign.id}/activities`,
        "POST",
        validActivity,
        cookie,
      ),
      { params: Promise.resolve({ id: activityDesign.id }) },
    );
    const activity = (await createResponse.json()).activity;

    const updateResponse = await activityPatch(
      request(
        `/api/activity-designs/${activityDesign.id}/activities/${activity.id}`,
        "PATCH",
        {
          name: "  Expanded Community Feeding  ",
          particulars: "  Nutrition Month launch  ",
          scheduledDate: "2026-09-03",
          venue: "  Municipal Covered Court  ",
          plannedParticipantCount: 120,
          plannedBudgetCentavos: 125000,
        },
        cookie,
      ),
      routeParams(activityDesign.id, activity.id),
    );

    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toMatchObject({
      activity: {
        id: activity.id,
        name: "Expanded Community Feeding",
        particulars: "Nutrition Month launch",
        scheduledDate: "2026-09-03T00:00:00.000Z",
        venue: "Municipal Covered Court",
        plannedParticipantCount: 120,
        plannedBudgetCentavos: 125000,
        mealScheduleCount: 0,
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
            name: "Expanded Community Feeding",
            particulars: "Nutrition Month launch",
            scheduledDate: "2026-09-03T00:00:00.000Z",
            venue: "Municipal Covered Court",
            plannedParticipantCount: 120,
            plannedBudgetCentavos: 125000,
          },
        ],
      },
    });
  });

  it.each([
    ["a blank name", { name: " " }, "name"],
    ["a missing scheduled date", { scheduledDate: "" }, "scheduledDate"],
    ["a negative participant count", { plannedParticipantCount: -1 }, "plannedParticipantCount"],
    ["a negative budget", { plannedBudgetCentavos: -1 }, "plannedBudgetCentavos"],
  ] as const)(
    "rejects editing with %s and leaves the saved Activity unchanged",
    async (_description, invalidFields, expectedField) => {
      const { cookie, activityDesign, activity } =
        await createActivityScenario();

      const response = await activityPatch(
        request(
          `/api/activity-designs/${activityDesign.id}/activities/${activity.id}`,
          "PATCH",
          { ...validActivity, ...invalidFields },
          cookie,
        ),
        routeParams(activityDesign.id, activity.id),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: "Please correct the highlighted Activity fields.",
        fields: { [expectedField]: expect.any(Array) },
      });
      await expect(
        prisma.activity.findUnique({ where: { id: activity.id } }),
      ).resolves.toMatchObject({
        name: validActivity.name,
        scheduledDate: new Date("2026-09-01T00:00:00.000Z"),
        plannedParticipantCount: null,
        plannedBudgetCentavos: null,
      });
    },
  );

  it("deletes an Activity without Meal Schedules", async () => {
    const { cookie, activityDesign, activity } =
      await createActivityScenario();

    const response = await activityDelete(
      request(
        `/api/activity-designs/${activityDesign.id}/activities/${activity.id}`,
        "DELETE",
        undefined,
        cookie,
      ),
      routeParams(activityDesign.id, activity.id),
    );

    expect(response.status).toBe(204);
    await expect(
      prisma.activity.findUnique({ where: { id: activity.id } }),
    ).resolves.toBeNull();
    await expect(
      prisma.activityDesign.findUnique({
        where: { id: activityDesign.id },
        include: { activities: true },
      }),
    ).resolves.toMatchObject({ activities: [] });
  });

  it("blocks deleting an Activity with Meal Schedules and preserves the child", async () => {
    const { cookie, activityDesign, activity } =
      await createActivityScenario();
    await prisma.mealSchedule.create({
      data: {
        id: "meal-schedule-for-delete-test",
        activityId: activity.id,
        label: "Lunch",
        mealTime: "12:00",
      },
    });

    const response = await activityDelete(
      request(
        `/api/activity-designs/${activityDesign.id}/activities/${activity.id}`,
        "DELETE",
        undefined,
        cookie,
      ),
      routeParams(activityDesign.id, activity.id),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        "This Activity cannot be deleted while it has Meal Schedules. Remove its Meal Schedules first.",
      mealScheduleCount: 1,
    });
    await expect(
      prisma.activity.findUnique({
        where: { id: activity.id },
        include: { mealSchedules: true },
      }),
    ).resolves.toMatchObject({
      id: activity.id,
      mealSchedules: [{ id: "meal-schedule-for-delete-test" }],
    });
  });

  it("rejects editing or deleting an Activity from another Activity Design", async () => {
    const { cookie, activityDesign, activity } =
      await createActivityScenario();
    const otherDesignResponse = await activityDesignsPost(
      request(
        "/api/activity-designs",
        "POST",
        { ...validActivityDesign, activityDesignNo: "AD-2026-018" },
        cookie,
      ),
    );
    const otherActivityDesign = (await otherDesignResponse.json()).activityDesign;

    const updateResponse = await activityPatch(
      request(
        `/api/activity-designs/${otherActivityDesign.id}/activities/${activity.id}`,
        "PATCH",
        { ...validActivity, name: "Should not move" },
        cookie,
      ),
      routeParams(otherActivityDesign.id, activity.id),
    );
    const deleteResponse = await activityDelete(
      request(
        `/api/activity-designs/${otherActivityDesign.id}/activities/${activity.id}`,
        "DELETE",
        undefined,
        cookie,
      ),
      routeParams(otherActivityDesign.id, activity.id),
    );

    expect(updateResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    await expect(
      prisma.activity.findUnique({ where: { id: activity.id } }),
    ).resolves.toMatchObject({
      activityDesignId: activityDesign.id,
      name: validActivity.name,
    });
  });

  it("requires authentication for Activity editing and deletion", async () => {
    const patchResponse = await activityPatch(
      request(
        "/api/activity-designs/missing-design/activities/missing-activity",
        "PATCH",
        validActivity,
      ),
      routeParams("missing-design", "missing-activity"),
    );
    const deleteResponse = await activityDelete(
      request(
        "/api/activity-designs/missing-design/activities/missing-activity",
        "DELETE",
      ),
      routeParams("missing-design", "missing-activity"),
    );

    expect(patchResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
  });
});
