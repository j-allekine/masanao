import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "better-auth/crypto";

const mocks = vi.hoisted(() => ({
  actionHeaders: new Headers(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => mocks.actionHeaders),
}));

import {
  createActivityAction,
  createActivityDesignAction,
  deleteActivityAction,
  updateActivityAction,
} from "@/features/activity-planning/actions";
import {
  listActivities,
  listActivityDesigns,
} from "@/features/activity-planning/server";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { prisma } from "@/prisma/client";

const staffPassword = "correct-horse-battery-staple";
const validActivityDesign = {
  activityDesignNo: "AD-2026-017",
  fiscalYear: 2026,
  title: "Municipal Nutrition Month",
};
const validActivity = {
  name: "Community Feeding",
  officeName: "Municipal Social Welfare and Development Office",
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

function setActionCookie(cookie = "") {
  mocks.actionHeaders = new Headers(cookie ? { cookie } : {});
}

function toFormData(values: Record<string, unknown>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) {
      formData.set(key, String(value));
    }
  }

  return formData;
}

async function createActivityDesign(
  cookie: string,
  values: Record<string, unknown> = validActivityDesign,
) {
  setActionCookie(cookie);
  await expect(
    createActivityDesignAction(toFormData(values)),
  ).resolves.toEqual({ status: "success" });

  const activityDesignNo = String(values.activityDesignNo).trim().toLowerCase();
  const activityDesign = (await listActivityDesigns()).find(
    (design) => design.activityDesignNo === activityDesignNo,
  );
  expect(activityDesign).toBeDefined();
  return activityDesign!;
}

async function createActivity(cookie: string, activityDesignId: string) {
  setActionCookie(cookie);
  const result = await createActivityAction(
    toFormData({ activityDesignId, ...validActivity }),
  );

  if (result.status !== "success") {
    throw new Error(result.error);
  }

  return result.activity;
}

async function createActivityScenario() {
  await createStaffAccount();
  const cookie = await cookieForStaff();
  const activityDesign = await createActivityDesign(cookie);
  const activity = await createActivity(cookie, activityDesign.id);

  return { cookie, activityDesign, activity };
}

describe("Activity edit and delete Server Action adapters", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.mealSchedule.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.activityDesign.deleteMany();
    await prisma.user.deleteMany();
    setActionCookie();
    mocks.revalidatePath.mockClear();
  });

  it("edits an Activity and returns the saved planning values after rereading through the workspace gateway", async () => {
    const { cookie, activityDesign, activity } =
      await createActivityScenario();

    setActionCookie(cookie);
    await expect(
      updateActivityAction(
        toFormData({
          activityDesignId: activityDesign.id,
          activityId: activity.id,
          name: "  Expanded Community Feeding  ",
          officeName: "  Municipal Health Office  ",
          particulars: "  Nutrition Month launch  ",
          scheduledDate: "2026-09-03",
          venue: "  Municipal Covered Court  ",
          plannedParticipantCount: 120,
          plannedBudgetPesos: "1250.00",
        }),
      ),
    ).resolves.toMatchObject({
      status: "success",
      activity: {
        id: activity.id,
        name: "Expanded Community Feeding",
        officeName: "Municipal Health Office",
        particulars: "Nutrition Month launch",
        scheduledDate: "2026-09-03T00:00:00.000Z",
        venue: "Municipal Covered Court",
        plannedParticipantCount: 120,
        plannedBudgetCentavos: "125000",
        mealScheduleCount: 0,
      },
    });

    await expect(listActivities()).resolves.toMatchObject([
      {
        id: activity.id,
        name: "Expanded Community Feeding",
        officeName: "Municipal Health Office",
        particulars: "Nutrition Month launch",
        scheduledDate: "2026-09-03T00:00:00.000Z",
        venue: "Municipal Covered Court",
        plannedParticipantCount: 120,
        plannedBudgetCentavos: "125000",
      },
    ]);
  });

  it.each([
    ["a blank name", { name: " " }, "name"],
    ["a blank office", { officeName: " " }, "officeName"],
    ["a missing scheduled date", { scheduledDate: "" }, "scheduledDate"],
    ["a negative participant count", { plannedParticipantCount: -1 }, "plannedParticipantCount"],
    ["a negative budget", { plannedBudgetPesos: "-1" }, "plannedBudgetPesos"],
  ] as const)(
    "rejects editing with %s and leaves the saved Activity unchanged",
    async (_description, invalidFields, expectedField) => {
      const { cookie, activityDesign, activity } =
        await createActivityScenario();
      setActionCookie(cookie);

      const result = await updateActivityAction(
        toFormData({
          ...validActivity,
          ...invalidFields,
          activityDesignId: activityDesign.id,
          activityId: activity.id,
        }),
      );

      expect(result).toMatchObject({
        status: "error",
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

    setActionCookie(cookie);
    await expect(
      deleteActivityAction(activityDesign.id, activity.id),
    ).resolves.toEqual({ status: "success" });
    await expect(
      prisma.activity.findUnique({ where: { id: activity.id } }),
    ).resolves.toBeNull();
    await expect(listActivities()).resolves.toEqual([]);
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

    setActionCookie(cookie);
    await expect(
      deleteActivityAction(activityDesign.id, activity.id),
    ).resolves.toEqual({
      status: "error",
      kind: "has-meal-schedules",
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
    const otherActivityDesign = await createActivityDesign(cookie, {
      ...validActivityDesign,
      activityDesignNo: "AD-2026-018",
    });

    setActionCookie(cookie);
    const updateResult = await updateActivityAction(
      toFormData({
        ...validActivity,
        name: "Should not move",
        activityDesignId: otherActivityDesign.id,
        activityId: activity.id,
      }),
    );
    const deleteResult = await deleteActivityAction(
      otherActivityDesign.id,
      activity.id,
    );

    expect(updateResult).toEqual({
      status: "error",
      error: "The Activity could not be found.",
      fields: {},
    });
    expect(deleteResult).toEqual({
      status: "error",
      kind: "not-found",
      error: "The Activity could not be found.",
    });
    await expect(
      prisma.activity.findUnique({ where: { id: activity.id } }),
    ).resolves.toMatchObject({
      activityDesignId: activityDesign.id,
      name: validActivity.name,
    });
  });

  it("requires authentication for Activity editing and deletion", async () => {
    const activityDesignId = "missing-design";
    const activityId = "missing-activity";

    await expect(
      updateActivityAction(
        toFormData({
          ...validActivity,
          activityDesignId,
          activityId,
        }),
      ),
    ).resolves.toEqual({
      status: "error",
      error: "Authentication required",
      fields: {},
    });
    await expect(
      deleteActivityAction(activityDesignId, activityId),
    ).resolves.toEqual({
      status: "error",
      error: "Authentication required",
    });
  });
});
