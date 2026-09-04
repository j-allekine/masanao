import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "better-auth/crypto";
import { Prisma } from "@/prisma/generated/client";

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
  createActivityDesignAction,
  deleteActivityDesignAction,
  updateActivityDesignAction,
} from "@/features/activity-planning/actions";
import { listActivityDesigns } from "@/features/activity-planning/server";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { prisma } from "@/prisma/client";

const staffPassword = "correct-horse-battery-staple";
const validActivityDesign = {
  activityDesignNo: "AD-2026-001",
  fiscalYear: 2026,
  title: "Municipal Nutrition Month",
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

async function createDesign(
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

describe("Activity Design feature seams", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.mealSchedule.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.activityDesign.deleteMany();
    await prisma.user.deleteMany();
    setActionCookie();
    mocks.revalidatePath.mockClear();
  });

  it("lists an empty Activity Designs collection through the public server gateway", async () => {
    await createStaffAccount();

    await expect(listActivityDesigns()).resolves.toEqual([]);
  });

  it("requires an authenticated staff member for Activity Design mutations", async () => {
    await expect(
      createActivityDesignAction(toFormData(validActivityDesign)),
    ).resolves.toEqual({
      status: "error",
      error: "Authentication required",
      fields: {},
    });
    expect(await prisma.activityDesign.count()).toBe(0);
  });

  it("creates an Activity Design with a normalized number and optional AIP reference", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();

    const activityDesign = await createDesign(cookie, {
      activityDesignNo: "  AD-2026-001  ",
      fiscalYear: 2026,
      title: "  Municipal Nutrition Month  ",
      aipReferenceCode: "  AIP-2026-014 ",
    });

    expect(activityDesign).toMatchObject({
      activityDesignNo: "ad-2026-001",
      fiscalYear: 2026,
      title: "Municipal Nutrition Month",
      aipReferenceCode: "AIP-2026-014",
      activityCount: 0,
    });
    await expect(
      prisma.activityDesign.findUnique({
        where: { activityDesignNo: "ad-2026-001" },
        include: { activities: { include: { mealSchedules: true } } },
      }),
    ).resolves.toMatchObject({
      activityDesignNo: "ad-2026-001",
      fiscalYear: 2026,
      title: "Municipal Nutrition Month",
      aipReferenceCode: "AIP-2026-014",
      activities: [],
    });
  });

  it("rejects a duplicate normalized Activity Design No. without creating a second design", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    await createDesign(cookie);

    setActionCookie(cookie);
    await expect(
      createActivityDesignAction(
        toFormData({
          ...validActivityDesign,
          activityDesignNo: "  ad-2026-001  ",
          title: "A duplicate planning context",
        }),
      ),
    ).resolves.toEqual({
      status: "error",
      error: "An Activity Design with that number already exists.",
      fields: {
        activityDesignNo: [
          "An Activity Design with that number already exists.",
        ],
      },
    });
    expect(await prisma.activityDesign.count()).toBe(1);
  });

  it.each([
    ["a blank Activity Design No.", { activityDesignNo: " " }, "activityDesignNo"],
    ["a blank title", { title: "\t" }, "title"],
    ["a fiscal year before 1900", { fiscalYear: 1899 }, "fiscalYear"],
    ["a fiscal year after 9999", { fiscalYear: 10000 }, "fiscalYear"],
    ["a non-whole fiscal year", { fiscalYear: 2026.5 }, "fiscalYear"],
    [
      "an overlong Activity Design No.",
      { activityDesignNo: "x".repeat(101) },
      "activityDesignNo",
    ],
    ["an overlong title", { title: "x".repeat(201) }, "title"],
    [
      "an overlong AIP Reference Code",
      { aipReferenceCode: "x".repeat(101) },
      "aipReferenceCode",
    ],
  ] as const)(
    "rejects %s with a clear field error",
    async (_description, invalidFields, expectedField) => {
      await createStaffAccount();
      const cookie = await cookieForStaff();
      setActionCookie(cookie);

      const result = await createActivityDesignAction(
        toFormData({ ...validActivityDesign, ...invalidFields }),
      );

      expect(result).toMatchObject({
        status: "error",
        error: "Please correct the highlighted Activity Design fields.",
        fields: { [expectedField]: expect.any(Array) },
      });
      expect(await prisma.activityDesign.count()).toBe(0);
    },
  );

  it("returns created Activity Designs through the public server gateway with empty child counts", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    await createDesign(cookie);

    await expect(listActivityDesigns()).resolves.toMatchObject([
      {
        activityDesignNo: "ad-2026-001",
        fiscalYear: 2026,
        title: "Municipal Nutrition Month",
        aipReferenceCode: null,
        activityCount: 0,
      },
    ]);
  });

  it("edits an Activity Design and persists normalized values after rereading", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createDesign(cookie);

    setActionCookie(cookie);
    await expect(
      updateActivityDesignAction(
        toFormData({
          id: activityDesign.id,
          activityDesignNo: "  AD-2026-002  ",
          fiscalYear: 2027,
          title: "  Updated Nutrition Month  ",
          aipReferenceCode: "  AIP-2026-099  ",
        }),
      ),
    ).resolves.toMatchObject({
      status: "success",
      activityDesign: {
        id: activityDesign.id,
        activityDesignNo: "ad-2026-002",
        fiscalYear: 2027,
        title: "Updated Nutrition Month",
        aipReferenceCode: "AIP-2026-099",
        activityCount: 0,
      },
    });

    await expect(listActivityDesigns()).resolves.toMatchObject([
      {
        activityDesignNo: "ad-2026-002",
        title: "Updated Nutrition Month",
        aipReferenceCode: "AIP-2026-099",
      },
    ]);
  });

  it("preserves an existing AIP reference when an update omits it", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createDesign(cookie, {
      ...validActivityDesign,
      aipReferenceCode: "AIP-2026-014",
    });

    setActionCookie(cookie);
    await expect(
      updateActivityDesignAction(
        toFormData({
          id: activityDesign.id,
          activityDesignNo: "AD-2026-002",
          fiscalYear: 2026,
          title: "Updated title",
        }),
      ),
    ).resolves.toMatchObject({
      status: "success",
      activityDesign: { aipReferenceCode: "AIP-2026-014" },
    });
  });

  it("clears an existing AIP reference when an update explicitly blanks it", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createDesign(cookie, {
      ...validActivityDesign,
      aipReferenceCode: "AIP-2026-014",
    });

    setActionCookie(cookie);
    await expect(
      updateActivityDesignAction(
        toFormData({
          id: activityDesign.id,
          activityDesignNo: "AD-2026-002",
          fiscalYear: 2026,
          title: validActivityDesign.title,
          aipReferenceCode: "  ",
        }),
      ),
    ).resolves.toMatchObject({
      status: "success",
      activityDesign: { aipReferenceCode: null },
    });
  });

  it("rejects a duplicate normalized Activity Design No. during edit", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const first = await createDesign(cookie);
    const second = await createDesign(cookie, {
      ...validActivityDesign,
      activityDesignNo: "AD-2026-002",
    });

    setActionCookie(cookie);
    await expect(
      updateActivityDesignAction(
        toFormData({
          id: second.id,
          activityDesignNo: "  ad-2026-001  ",
          fiscalYear: 2026,
          title: "Should not be saved",
          aipReferenceCode: "",
        }),
      ),
    ).resolves.toEqual({
      status: "error",
      error: "An Activity Design with that number already exists.",
      fields: {
        activityDesignNo: [
          "An Activity Design with that number already exists.",
        ],
      },
    });
    await expect(
      prisma.activityDesign.findUnique({ where: { id: second.id } }),
    ).resolves.toMatchObject({
      activityDesignNo: "ad-2026-002",
      title: validActivityDesign.title,
    });
    await expect(
      prisma.activityDesign.findUnique({ where: { id: first.id } }),
    ).resolves.toMatchObject({ activityDesignNo: "ad-2026-001" });
  });

  it.each([
    ["a blank Activity Design No.", { activityDesignNo: " " }, "activityDesignNo"],
    ["a blank title", { title: "\t" }, "title"],
    [
      "an overlong Activity Design No.",
      { activityDesignNo: "x".repeat(101) },
      "activityDesignNo",
    ],
    ["an overlong title", { title: "x".repeat(201) }, "title"],
    [
      "an overlong AIP Reference Code",
      { aipReferenceCode: "x".repeat(101) },
      "aipReferenceCode",
    ],
  ] as const)(
    "rejects %s during edit with a clear field error",
    async (_description, invalidFields, expectedField) => {
      await createStaffAccount();
      const cookie = await cookieForStaff();
      const activityDesign = await createDesign(cookie);
      setActionCookie(cookie);

      const result = await updateActivityDesignAction(
        toFormData({
          id: activityDesign.id,
          activityDesignNo: "AD-2026-002",
          fiscalYear: 2026,
          title: "Updated title",
          aipReferenceCode: "AIP-2026-002",
          ...invalidFields,
        }),
      );

      expect(result).toMatchObject({
        status: "error",
        error: "Please correct the highlighted Activity Design fields.",
        fields: { [expectedField]: expect.any(Array) },
      });
      await expect(
        prisma.activityDesign.findUnique({ where: { id: activityDesign.id } }),
      ).resolves.toMatchObject({ activityDesignNo: "ad-2026-001" });
    },
  );

  it("requires authentication for editing and deleting", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createDesign(cookie);
    setActionCookie();

    const editResult = await updateActivityDesignAction(
      toFormData({
        id: activityDesign.id,
        activityDesignNo: "AD-2026-002",
        fiscalYear: 2026,
        title: validActivityDesign.title,
      }),
    );
    const deleteResult = await deleteActivityDesignAction(activityDesign.id);

    expect(editResult).toEqual({
      status: "error",
      error: "Authentication required",
      fields: {},
    });
    expect(deleteResult).toEqual({
      status: "error",
      kind: "not-found",
      error: "Authentication required",
    });
    expect(await prisma.activityDesign.count()).toBe(1);
  });

  it("deletes an Activity Design without Activities", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createDesign(cookie);

    setActionCookie(cookie);
    await expect(
      deleteActivityDesignAction(activityDesign.id),
    ).resolves.toEqual({ status: "success" });
    expect(await prisma.activityDesign.count()).toBe(0);
  });

  it("blocks deleting an Activity Design with Activities and preserves its children", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createDesign(cookie);
    const activity = await prisma.activity.create({
      data: {
        id: "blocking-activity",
        activityDesignId: activityDesign.id,
        name: "Existing activity",
        officeName: "Municipal Social Welfare and Development Office",
        scheduledDate: new Date("2026-09-01T00:00:00.000Z"),
      },
    });

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
    await expect(
      prisma.activity.findUnique({ where: { id: activity.id } }),
    ).resolves.toMatchObject({ activityDesignId: activityDesign.id });
    expect(await prisma.activityDesign.count()).toBe(1);
  });

  it("returns not found when a concurrent delete removes the design first", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const activityDesign = await createDesign(cookie);
    const deleteSpy = vi
      .spyOn(prisma.activityDesign, "delete")
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError(
          "Record to delete does not exist.",
          { code: "P2025", clientVersion: "7.10.0" },
        ),
      );

    try {
      setActionCookie(cookie);
      await expect(
        deleteActivityDesignAction(activityDesign.id),
      ).resolves.toEqual({
        status: "error",
        kind: "not-found",
        error: "The Activity Design could not be found.",
      });
    } finally {
      deleteSpy.mockRestore();
    }
  });
});
