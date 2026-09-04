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
  deleteActivityDesignAction,
} from "@/features/activity-planning/actions";
import {
  listActivities,
  listActivityDesigns,
} from "@/features/activity-planning/server";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { prisma } from "@/prisma/client";

const staffPassword = "correct-horse-battery-staple";
const validActivityDesign = {
  activityDesignNo: "AD-2026-001",
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

async function createActivityDesign(cookie: string) {
  setActionCookie(cookie);
  await expect(
    createActivityDesignAction(toFormData(validActivityDesign)),
  ).resolves.toEqual({ status: "success" });

  const activityDesign = (await listActivityDesigns()).find(
    (design) => design.activityDesignNo === "ad-2026-001",
  );
  expect(activityDesign).toBeDefined();
  return activityDesign!;
}

async function createActivity(
  cookie: string,
  activityDesignId: string,
  values: Record<string, unknown> = validActivity,
) {
  setActionCookie(cookie);
  const result = await createActivityAction(
    toFormData({ activityDesignId, ...values }),
  );

  if (result.status !== "success") {
    throw new Error(result.error);
  }

  return result.activity;
}

describe("Activity feature seams", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.mealSchedule.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.activityDesign.deleteMany();
    await prisma.user.deleteMany();
    setActionCookie();
    mocks.revalidatePath.mockClear();
  });

  it("creates an Activity with optional planning values and lists it in the workspace gateway without Meal Schedules", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createActivityDesign(cookie);

    const activity = await createActivity(cookie, activityDesign.id, {
      name: "  Community Feeding  ",
      officeName: "  Municipal Social Welfare and Development Office  ",
      particulars: "  Nutrition Month launch  ",
      scheduledDate: "2026-09-01",
      venue: "  Municipal Covered Court  ",
      plannedParticipantCount: 120,
      plannedBudgetPesos: "1250.00",
    });

    expect(activity).toMatchObject({
      activityDesignId: activityDesign.id,
      name: "Community Feeding",
      officeName: "Municipal Social Welfare and Development Office",
      particulars: "Nutrition Month launch",
      scheduledDate: "2026-09-01T00:00:00.000Z",
      venue: "Municipal Covered Court",
      plannedParticipantCount: 120,
      plannedBudgetCentavos: "125000",
      mealScheduleCount: 0,
    });
    await expect(listActivities()).resolves.toMatchObject([
      {
        id: activity.id,
        activityDesignId: activityDesign.id,
        name: "Community Feeding",
        mealScheduleCount: 0,
      },
    ]);
    await expect(
      prisma.activity.findUnique({
        where: { id: activity.id },
        include: { mealSchedules: true },
      }),
    ).resolves.toMatchObject({
      activityDesignId: activityDesign.id,
      scheduledDate: new Date("2026-09-01T00:00:00.000Z"),
      mealSchedules: [],
    });
  });

  it("persists a large peso budget exactly as centavos", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createActivityDesign(cookie);

    const activity = await createActivity(cookie, activityDesign.id, {
      ...validActivity,
      plannedBudgetPesos: "21474836.48",
    });

    expect(activity.plannedBudgetCentavos).toBe("2147483648");
    await expect(
      prisma.activity.findUnique({ where: { id: activity.id } }),
    ).resolves.toMatchObject({ plannedBudgetCentavos: BigInt(2_147_483_648) });
  });

  it.each([
    ["0", "0"],
    ["12.3", "1230"],
    ["12.34", "1234"],
  ] as const)(
    "converts a peso amount with the accepted decimal precision exactly",
    async (plannedBudgetPesos, expectedCentavos) => {
      await createStaffAccount();
      const cookie = await cookieForStaff();
      const activityDesign = await createActivityDesign(cookie);

      const activity = await createActivity(cookie, activityDesign.id, {
        ...validActivity,
        plannedBudgetPesos,
      });

      expect(activity.plannedBudgetCentavos).toBe(expectedCentavos);
    },
  );

  it("maps a blank budget to no persisted budget", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createActivityDesign(cookie);

    const activity = await createActivity(cookie, activityDesign.id, {
      ...validActivity,
      plannedBudgetPesos: "   ",
    });

    expect(activity.plannedBudgetCentavos).toBeNull();
    await expect(
      prisma.activity.findUnique({ where: { id: activity.id } }),
    ).resolves.toMatchObject({ plannedBudgetCentavos: null });
  });

  it.each([
    ["negative", "-1"],
    ["malformed", "12 pesos"],
    ["scientific notation", "1e3"],
    ["over-precision", "12.345"],
    ["above the signed 64-bit maximum", "92233720368547758.08"],
  ] as const)(
    "rejects %s peso budget input without persistence",
    async (_description, plannedBudgetPesos) => {
      await createStaffAccount();
      const cookie = await cookieForStaff();
      const activityDesign = await createActivityDesign(cookie);
      setActionCookie(cookie);

      const result = await createActivityAction(
        toFormData({ ...validActivity, activityDesignId: activityDesign.id, plannedBudgetPesos }),
      );

      expect(result).toMatchObject({
        status: "error",
        fields: { plannedBudgetPesos: expect.any(Array) },
      });
      expect(await prisma.activity.count()).toBe(0);
    },
  );

  it("accepts the maximum signed 64-bit centavo value", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createActivityDesign(cookie);

    const activity = await createActivity(cookie, activityDesign.id, {
      ...validActivity,
      plannedBudgetPesos: "92233720368547758.07",
    });

    expect(activity.plannedBudgetCentavos).toBe("9223372036854775807");
  });

  it("returns an empty Activity collection through the public server gateway for a saved Activity Design", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    await createActivityDesign(cookie);

    await expect(listActivities()).resolves.toEqual([]);
  });

  it("rejects participants outside the Prisma Int range while allowing a larger budget range", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createActivityDesign(cookie);
    setActionCookie(cookie);

    const result = await createActivityAction(
      toFormData({
        ...validActivity,
        activityDesignId: activityDesign.id,
        plannedParticipantCount: 2_147_483_648,
        plannedBudgetPesos: "21474836.48",
      }),
    );

    expect(result).toMatchObject({
      status: "error",
      error: "Please correct the highlighted Activity fields.",
      fields: {
        plannedParticipantCount: [
          "Planned participant count exceeds the supported maximum",
        ],
      },
    });
    expect(await prisma.activity.count()).toBe(0);
  });

  it.each([
    ["a blank name", { name: " " }, "name"],
    ["a blank office", { officeName: " " }, "officeName"],
    ["a missing scheduled date", { scheduledDate: "" }, "scheduledDate"],
    ["an invalid scheduled date", { scheduledDate: "2026-02-30" }, "scheduledDate"],
    ["a negative participant count", { plannedParticipantCount: -1 }, "plannedParticipantCount"],
    ["a negative budget", { plannedBudgetPesos: "-1" }, "plannedBudgetPesos"],
    ["an overlong activity name", { name: "x".repeat(201) }, "name"],
    ["an overlong office", { officeName: "x".repeat(201) }, "officeName"],
    ["overlong activity particulars", { particulars: "x".repeat(2_001) }, "particulars"],
    ["an overlong venue", { venue: "x".repeat(301) }, "venue"],
  ] as const)(
    "rejects %s without creating an Activity",
    async (_description, invalidFields, expectedField) => {
      await createStaffAccount();
      const cookie = await cookieForStaff();
      const activityDesign = await createActivityDesign(cookie);
      setActionCookie(cookie);

      const result = await createActivityAction(
        toFormData({
          ...validActivity,
          ...invalidFields,
          activityDesignId: activityDesign.id,
        }),
      );

      expect(result).toMatchObject({
        status: "error",
        error: "Please correct the highlighted Activity fields.",
        fields: { [expectedField]: expect.any(Array) },
      });
      expect(await prisma.activity.count()).toBe(0);
    },
  );

  it("rejects an invalid parent Activity Design before persistence", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    setActionCookie(cookie);

    await expect(
      createActivityAction(
        toFormData({ ...validActivity, activityDesignId: "missing-design" }),
      ),
    ).resolves.toEqual({
      status: "error",
      error: "The Activity Design could not be found.",
      fields: {},
    });
    expect(await prisma.activity.count()).toBe(0);
  });

  it("requires authentication for Activity creation", async () => {
    await expect(
      createActivityAction(
        toFormData({ ...validActivity, activityDesignId: "missing-design" }),
      ),
    ).resolves.toEqual({
      status: "error",
      error: "Authentication required",
      fields: {},
    });
  });

  it("blocks deleting an Activity Design after an Activity is created under it", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createActivityDesign(cookie);
    await createActivity(cookie, activityDesign.id);

    setActionCookie(cookie);
    await expect(
      deleteActivityDesignAction(activityDesign.id),
    ).resolves.toEqual({
      status: "error",
      kind: "has-activities",
      error:
        "This Activity Design cannot be deleted while it has Activities. Remove its Activities first.",
      activityCount: 1,
    });
    expect(await prisma.activity.count()).toBe(1);
    expect(await prisma.activityDesign.count()).toBe(1);
  });
});
