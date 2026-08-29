import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "better-auth/crypto";
import {
  GET as activityDesignsGet,
  POST as activityDesignsPost,
} from "@/app/api/activity-designs/route";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { prisma } from "@/lib/prisma";

const staffPassword = "correct-horse-battery-staple";
const validActivityDesign = {
  activityDesignNo: "AD-2026-001",
  fiscalYear: 2026,
  title: "Municipal Nutrition Month",
  officeName: "Municipal Social Welfare and Development Office",
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

function activityDesignsRequest(
  method: "GET" | "POST",
  body?: Record<string, unknown>,
  cookie = "",
) {
  return new Request("http://localhost:3000/api/activity-designs", {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("activity designs API", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.mealSchedule.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.activityDesign.deleteMany();
    await prisma.user.deleteMany();
  });

  it("lists an empty Activity Designs collection for an authenticated staff member", async () => {
    await createStaffAccount();

    const response = await activityDesignsGet(
      activityDesignsRequest("GET", undefined, await cookieForStaff()),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ activityDesigns: [] });
  });

  it("requires an authenticated staff member for listing and creation", async () => {
    const listResponse = await activityDesignsGet(activityDesignsRequest("GET"));
    const createResponse = await activityDesignsPost(
      activityDesignsRequest("POST", validActivityDesign),
    );

    expect(listResponse.status).toBe(401);
    expect(createResponse.status).toBe(401);
    expect(await prisma.activityDesign.count()).toBe(0);
  });

  it("creates an Activity Design with a normalized number and optional AIP reference", async () => {
    await createStaffAccount();

    const response = await activityDesignsPost(
      activityDesignsRequest(
        "POST",
        {
          activityDesignNo: "  AD-2026-001  ",
          fiscalYear: 2026,
          title: "  Municipal Nutrition Month  ",
          officeName: "  Municipal Social Welfare and Development Office ",
          aipReferenceCode: "  AIP-2026-014 ",
        },
        await cookieForStaff(),
      ),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      activityDesign: {
        activityDesignNo: "ad-2026-001",
        fiscalYear: 2026,
        title: "Municipal Nutrition Month",
        officeName: "Municipal Social Welfare and Development Office",
        aipReferenceCode: "AIP-2026-014",
        activityCount: 0,
      },
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
      officeName: "Municipal Social Welfare and Development Office",
      aipReferenceCode: "AIP-2026-014",
      activities: [],
    });
  });

  it("rejects a duplicate normalized Activity Design No. without creating a second design", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();

    const firstResponse = await activityDesignsPost(
      activityDesignsRequest("POST", validActivityDesign, cookie),
    );
    const duplicateResponse = await activityDesignsPost(
      activityDesignsRequest(
        "POST",
        {
          ...validActivityDesign,
          activityDesignNo: "  ad-2026-001  ",
          title: "A duplicate planning context",
        },
        cookie,
      ),
    );

    expect(firstResponse.status).toBe(201);
    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toMatchObject({
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
    ["a blank office", { officeName: "  " }, "officeName"],
    ["a fiscal year before 1900", { fiscalYear: 1899 }, "fiscalYear"],
    ["a fiscal year after 9999", { fiscalYear: 10000 }, "fiscalYear"],
    ["a non-whole fiscal year", { fiscalYear: 2026.5 }, "fiscalYear"],
    [
      "an overlong Activity Design No.",
      { activityDesignNo: "x".repeat(101) },
      "activityDesignNo",
    ],
    ["an overlong title", { title: "x".repeat(201) }, "title"],
    ["an overlong office", { officeName: "x".repeat(201) }, "officeName"],
    [
      "an overlong AIP Reference Code",
      { aipReferenceCode: "x".repeat(101) },
      "aipReferenceCode",
    ],
  ] as const)(
    "rejects %s with a clear field error",
    async (_description, invalidFields, expectedField) => {
      await createStaffAccount();

      const response = await activityDesignsPost(
        activityDesignsRequest(
          "POST",
          { ...validActivityDesign, ...invalidFields },
          await cookieForStaff(),
        ),
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toBe(
        "Please correct the highlighted Activity Design fields.",
      );
      expect(payload.fields).toHaveProperty(expectedField);
      expect(await prisma.activityDesign.count()).toBe(0);
    },
  );

  it("returns created Activity Designs in the list with empty child counts", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();

    await activityDesignsPost(
      activityDesignsRequest("POST", validActivityDesign, cookie),
    );

    const response = await activityDesignsGet(
      activityDesignsRequest("GET", undefined, cookie),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      activityDesigns: [
        {
          activityDesignNo: "ad-2026-001",
          fiscalYear: 2026,
          title: "Municipal Nutrition Month",
          officeName: "Municipal Social Welfare and Development Office",
          aipReferenceCode: null,
          activityCount: 0,
        },
      ],
    });
  });
});
