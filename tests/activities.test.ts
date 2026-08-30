import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "better-auth/crypto";

import {
  GET as activityDesignGet,
} from "@/app/api/activity-designs/[id]/route";
import {
  POST as activitiesPost,
} from "@/app/api/activity-designs/[id]/activities/route";
import {
  DELETE as activityDesignDelete,
} from "@/app/api/activity-designs/[id]/route";
import {
  POST as activityDesignsPost,
} from "@/app/api/activity-designs/route";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { prisma } from "@/prisma/client";

const staffPassword = "correct-horse-battery-staple";
const validActivityDesign = {
  activityDesignNo: "AD-2026-001",
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
  method: "GET" | "POST" | "DELETE",
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

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("activities API", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.mealSchedule.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.activityDesign.deleteMany();
    await prisma.user.deleteMany();
  });

  async function createActivityDesign(cookie: string) {
    const response = await activityDesignsPost(
      request("/api/activity-designs", "POST", validActivityDesign, cookie),
    );

    expect(response.status).toBe(201);
    return (await response.json()).activityDesign;
  }

  it("creates an Activity with optional planning values and lists it under its parent without Meal Schedules", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createActivityDesign(cookie);

    const createResponse = await activitiesPost(
      request(
        `/api/activity-designs/${activityDesign.id}/activities`,
        "POST",
        {
          name: "  Community Feeding  ",
          particulars: "  Nutrition Month launch  ",
          scheduledDate: "2026-09-01",
          venue: "  Municipal Covered Court  ",
          plannedParticipantCount: 120,
          plannedBudgetCentavos: 125000,
        },
        cookie,
      ),
      routeParams(activityDesign.id),
    );

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created).toMatchObject({
      activity: {
        activityDesignId: activityDesign.id,
        name: "Community Feeding",
        particulars: "Nutrition Month launch",
        scheduledDate: "2026-09-01T00:00:00.000Z",
        venue: "Municipal Covered Court",
        plannedParticipantCount: 120,
        plannedBudgetCentavos: 125000,
        mealScheduleCount: 0,
      },
    });

    const detailResponse = await activityDesignGet(
      request(`/api/activity-designs/${activityDesign.id}`, "GET", undefined, cookie),
      routeParams(activityDesign.id),
    );

    expect(detailResponse.status).toBe(200);
    expect(await detailResponse.json()).toMatchObject({
      activityDesign: {
        id: activityDesign.id,
        activityCount: 1,
        activities: [
          {
            id: created.activity.id,
            name: "Community Feeding",
            scheduledDate: "2026-09-01T00:00:00.000Z",
            mealScheduleCount: 0,
          },
        ],
      },
    });

    await expect(
      prisma.activity.findUnique({
        where: { id: created.activity.id },
        include: { mealSchedules: true },
      }),
    ).resolves.toMatchObject({
      activityDesignId: activityDesign.id,
      scheduledDate: new Date("2026-09-01T00:00:00.000Z"),
      mealSchedules: [],
    });
  });

  it("returns an empty Activity collection for a saved Activity Design", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createActivityDesign(cookie);

    const response = await activityDesignGet(
      request(
        `/api/activity-designs/${activityDesign.id}`,
        "GET",
        undefined,
        cookie,
      ),
      routeParams(activityDesign.id),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      activityDesign: {
        id: activityDesign.id,
        activityCount: 0,
        activities: [],
      },
    });
  });

  it("rejects integers outside the Prisma Int range with field-level errors", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createActivityDesign(cookie);

    const response = await activitiesPost(
      request(
        `/api/activity-designs/${activityDesign.id}/activities`,
        "POST",
        {
          ...validActivity,
          plannedParticipantCount: 2_147_483_648,
          plannedBudgetCentavos: 2_147_483_648,
        },
        cookie,
      ),
      routeParams(activityDesign.id),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "Please correct the highlighted Activity fields.",
      fields: {
        plannedParticipantCount: [
          "Planned participant count exceeds the supported maximum",
        ],
        plannedBudgetCentavos: [
          "Planned budget exceeds the supported maximum",
        ],
      },
    });
    expect(await prisma.activity.count()).toBe(0);
  });

  it.each([
    ["a blank name", { name: " " }, "name"],
    ["a missing scheduled date", { scheduledDate: "" }, "scheduledDate"],
    ["an invalid scheduled date", { scheduledDate: "2026-02-30" }, "scheduledDate"],
    ["a negative participant count", { plannedParticipantCount: -1 }, "plannedParticipantCount"],
    ["a negative budget", { plannedBudgetCentavos: -1 }, "plannedBudgetCentavos"],
    ["an overlong activity name", { name: "x".repeat(201) }, "name"],
    ["overlong activity particulars", { particulars: "x".repeat(2_001) }, "particulars"],
    ["an overlong venue", { venue: "x".repeat(301) }, "venue"],
  ] as const)(
    "rejects %s without creating an Activity",
    async (_description, invalidFields, expectedField) => {
      await createStaffAccount();
      const cookie = await cookieForStaff();
      const activityDesign = await createActivityDesign(cookie);

      const response = await activitiesPost(
        request(
          `/api/activity-designs/${activityDesign.id}/activities`,
          "POST",
          { ...validActivity, ...invalidFields },
          cookie,
        ),
        routeParams(activityDesign.id),
      );

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.error).toBe(
        "Please correct the highlighted Activity fields.",
      );
      expect(payload.fields).toHaveProperty(expectedField);
      expect(await prisma.activity.count()).toBe(0);
    },
  );

  it("rejects an invalid parent Activity Design before persistence", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();

    const response = await activitiesPost(
      request(
        "/api/activity-designs/missing-design/activities",
        "POST",
        validActivity,
        cookie,
      ),
      routeParams("missing-design"),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "The Activity Design could not be found.",
      fields: {},
    });
    expect(await prisma.activity.count()).toBe(0);
  });

  it("requires authentication for Activity detail and creation", async () => {
    const detailResponse = await activityDesignGet(
      request("/api/activity-designs/missing-design", "GET"),
      routeParams("missing-design"),
    );
    const createResponse = await activitiesPost(
      request(
        "/api/activity-designs/missing-design/activities",
        "POST",
        validActivity,
      ),
      routeParams("missing-design"),
    );

    expect(detailResponse.status).toBe(401);
    expect(createResponse.status).toBe(401);
  });

  it("blocks deleting an Activity Design after an Activity is created under it", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createActivityDesign(cookie);

    await activitiesPost(
      request(
        `/api/activity-designs/${activityDesign.id}/activities`,
        "POST",
        validActivity,
        cookie,
      ),
      routeParams(activityDesign.id),
    );

    const response = await activityDesignDelete(
      request(`/api/activity-designs/${activityDesign.id}`, "DELETE", undefined, cookie),
      routeParams(activityDesign.id),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        "This Activity Design cannot be deleted while it has Activities. Remove its Activities first.",
      activityCount: 1,
    });
    expect(await prisma.activity.count()).toBe(1);
    expect(await prisma.activityDesign.count()).toBe(1);
  });
});
