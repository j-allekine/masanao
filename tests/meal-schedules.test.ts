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
  createMealScheduleAction,
  deleteMealScheduleAction,
  updateMealScheduleAction,
} from "@/features/activity-planning/actions";
import { listActivities, listActivityDesigns } from "@/features/activity-planning/server";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { prisma } from "@/prisma/client";

const staffPassword = "correct-horse-battery-staple";
const validActivityDesign = {
  activityDesignNo: "AD-2026-018",
  fiscalYear: 2026,
  title: "Municipal Nutrition Month",
};
const validActivity = {
  name: "Community Feeding",
  officeName: "Municipal Social Welfare and Development Office",
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

async function readMealSchedules(activityId: string) {
  return prisma.mealSchedule.findMany({
    where: { activityId },
    orderBy: [{ mealTime: "asc" }, { label: "asc" }],
  });
}

describe("Meal Schedule Server Action adapters", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.mealSchedule.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.activityDesign.deleteMany();
    await prisma.user.deleteMany();
    setActionCookie();
    mocks.revalidatePath.mockClear();
  });

  it("creates multiple Meal Schedules and rereads them from the isolated database", async () => {
    const { cookie, activity } = await createActivityScenario();

    setActionCookie(cookie);
    await expect(
      createMealScheduleAction(
        toFormData({
          activityDesignId: activity.activityDesignId,
          activityId: activity.id,
          label: "  Lunch  ",
          mealTime: "12:00",
          plannedServings: 120,
        }),
      ),
    ).resolves.toMatchObject({
      status: "success",
      mealSchedule: {
        activityId: activity.id,
        label: "Lunch",
        mealTime: "12:00",
        plannedServings: 120,
      },
    });
    await expect(
      createMealScheduleAction(
        toFormData({
          activityDesignId: activity.activityDesignId,
          activityId: activity.id,
          label: "Snack",
          mealTime: "15:30",
        }),
      ),
    ).resolves.toMatchObject({
      status: "success",
      mealSchedule: {
        activityId: activity.id,
        label: "Snack",
        mealTime: "15:30",
        plannedServings: null,
      },
    });

    await expect(readMealSchedules(activity.id)).resolves.toMatchObject([
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
    ]);
  });

  it("keeps an Activity without Meal Schedules valid and presents an empty collection", async () => {
    const { activity } = await createActivityScenario();

    await expect(listActivities()).resolves.toMatchObject([
      { id: activity.id, mealScheduleCount: 0 },
    ]);
    await expect(readMealSchedules(activity.id)).resolves.toEqual([]);
  });

  it("edits a Meal Schedule and persists the saved values after rereading", async () => {
    const { cookie, activity } = await createActivityScenario();
    setActionCookie(cookie);
    const createResult = await createMealScheduleAction(
      toFormData({
        activityDesignId: activity.activityDesignId,
        activityId: activity.id,
        ...validMealSchedule,
        plannedServings: 120,
      }),
    );
    if (createResult.status !== "success") {
      throw new Error(createResult.error);
    }

    const updateResult = await updateMealScheduleAction(
      toFormData({
        activityDesignId: activity.activityDesignId,
        activityId: activity.id,
        mealScheduleId: createResult.mealSchedule.id,
        label: "  Dinner  ",
        mealTime: "18:45",
        plannedServings: 240,
      }),
    );

    expect(updateResult).toMatchObject({
      status: "success",
      mealSchedule: {
        id: createResult.mealSchedule.id,
        activityId: activity.id,
        label: "Dinner",
        mealTime: "18:45",
        plannedServings: 240,
      },
    });
    await expect(readMealSchedules(activity.id)).resolves.toMatchObject([
      {
        id: createResult.mealSchedule.id,
        label: "Dinner",
        mealTime: "18:45",
        plannedServings: 240,
      },
    ]);
  });

  it.each([
    ["a blank label", { label: " " }, "label"],
    ["an invalid time", { mealTime: "24:00" }, "mealTime"],
    ["negative planned servings", { plannedServings: -1 }, "plannedServings"],
  ] as const)(
    "rejects editing with %s and leaves the saved Meal Schedule unchanged",
    async (_description, invalidFields, expectedField) => {
      const { cookie, activity } = await createActivityScenario();
      setActionCookie(cookie);
      const createResult = await createMealScheduleAction(
        toFormData({
          activityDesignId: activity.activityDesignId,
          activityId: activity.id,
          ...validMealSchedule,
          plannedServings: 120,
        }),
      );
      if (createResult.status !== "success") {
        throw new Error(createResult.error);
      }

      const result = await updateMealScheduleAction(
        toFormData({
          activityDesignId: activity.activityDesignId,
          activityId: activity.id,
          mealScheduleId: createResult.mealSchedule.id,
          ...validMealSchedule,
          plannedServings: 120,
          ...invalidFields,
        }),
      );

      expect(result).toMatchObject({
        status: "error",
        error: "Please correct the highlighted Meal Schedule fields.",
        fields: { [expectedField]: expect.any(Array) },
      });
      await expect(
        prisma.mealSchedule.findUnique({
          where: { id: createResult.mealSchedule.id },
        }),
      ).resolves.toMatchObject({
        label: validMealSchedule.label,
        mealTime: validMealSchedule.mealTime,
        plannedServings: 120,
      });
    },
  );

  it("deletes a Meal Schedule without an Issuance Record and preserves the Activity", async () => {
    const { cookie, activity } = await createActivityScenario();
    setActionCookie(cookie);
    const createResult = await createMealScheduleAction(
      toFormData({
        activityDesignId: activity.activityDesignId,
        activityId: activity.id,
        ...validMealSchedule,
      }),
    );
    if (createResult.status !== "success") {
      throw new Error(createResult.error);
    }

    await expect(
      deleteMealScheduleAction(
        activity.activityDesignId,
        activity.id,
        createResult.mealSchedule.id,
      ),
    ).resolves.toEqual({ status: "success" });
    await expect(
      prisma.mealSchedule.findUnique({
        where: { id: createResult.mealSchedule.id },
      }),
    ).resolves.toBeNull();
    await expect(listActivities()).resolves.toMatchObject([
      { id: activity.id, mealScheduleCount: 0 },
    ]);
  });

  it("rejects editing or deleting a Meal Schedule from another Activity Design", async () => {
    const { cookie, activityDesign, activity } =
      await createActivityScenario();
    setActionCookie(cookie);
    const createResult = await createMealScheduleAction(
      toFormData({
        activityDesignId: activityDesign.id,
        activityId: activity.id,
        ...validMealSchedule,
      }),
    );
    if (createResult.status !== "success") {
      throw new Error(createResult.error);
    }
    const otherDesign = await createActivityDesign(cookie, {
      ...validActivityDesign,
      activityDesignNo: "AD-2026-019",
    });

    const updateResult = await updateMealScheduleAction(
      toFormData({
        activityDesignId: otherDesign.id,
        activityId: activity.id,
        mealScheduleId: createResult.mealSchedule.id,
        label: "Should not move",
        mealTime: "18:00",
      }),
    );
    const deleteResult = await deleteMealScheduleAction(
      otherDesign.id,
      activity.id,
      createResult.mealSchedule.id,
    );

    expect(updateResult).toEqual({
      status: "error",
      error: "The Meal Schedule could not be found.",
      fields: {},
    });
    expect(deleteResult).toEqual({
      status: "error",
      error: "The Meal Schedule could not be found.",
    });
    await expect(
      prisma.mealSchedule.findUnique({
        where: { id: createResult.mealSchedule.id },
      }),
    ).resolves.toMatchObject({
      activityId: activity.id,
      label: validMealSchedule.label,
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
      const { cookie, activity } = await createActivityScenario();
      setActionCookie(cookie);

      const result = await createMealScheduleAction(
        toFormData({
          activityDesignId: activity.activityDesignId,
          activityId: activity.id,
          ...validMealSchedule,
          ...invalidFields,
        }),
      );

      expect(result).toMatchObject({
        status: "error",
        error: "Please correct the highlighted Meal Schedule fields.",
        fields: { [expectedField]: expect.any(Array) },
      });
      expect(await prisma.mealSchedule.count()).toBe(0);
    },
  );

  it("rejects missing or mismatched parent Activities before persistence", async () => {
    const { cookie, activityDesign, activity } =
      await createActivityScenario();
    setActionCookie(cookie);

    await expect(
      createMealScheduleAction(
        toFormData({
          activityDesignId: activityDesign.id,
          activityId: "missing-activity",
          ...validMealSchedule,
        }),
      ),
    ).resolves.toEqual({
      status: "error",
      error: "The Activity could not be found.",
      fields: {},
    });

    const otherDesign = await createActivityDesign(cookie, {
      ...validActivityDesign,
      activityDesignNo: "AD-2026-019",
    });
    await expect(
      createMealScheduleAction(
        toFormData({
          activityDesignId: otherDesign.id,
          activityId: activity.id,
          ...validMealSchedule,
        }),
      ),
    ).resolves.toEqual({
      status: "error",
      error: "The Activity could not be found.",
      fields: {},
    });
    expect(await prisma.mealSchedule.count()).toBe(0);
  });

  it("requires authentication for Meal Schedule creation", async () => {
    await expect(
      createMealScheduleAction(
        toFormData({
          activityDesignId: "missing-design",
          activityId: "missing-activity",
          ...validMealSchedule,
        }),
      ),
    ).resolves.toEqual({
      status: "error",
      error: "Authentication required",
      fields: {},
    });
    expect(await prisma.mealSchedule.count()).toBe(0);
  });

  it("requires authentication for Meal Schedule editing and deletion", async () => {
    await expect(
      updateMealScheduleAction(
        toFormData({
          activityDesignId: "missing-design",
          activityId: "missing-activity",
          mealScheduleId: "missing-schedule",
          ...validMealSchedule,
        }),
      ),
    ).resolves.toEqual({
      status: "error",
      error: "Authentication required",
      fields: {},
    });
    await expect(
      deleteMealScheduleAction(
        "missing-design",
        "missing-activity",
        "missing-schedule",
      ),
    ).resolves.toEqual({
      status: "error",
      error: "Authentication required",
    });
  });
});
