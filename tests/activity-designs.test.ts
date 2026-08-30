import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "better-auth/crypto";
import {
  GET as activityDesignsGet,
  POST as activityDesignsPost,
} from "@/app/api/activity-designs/route";
import {
  DELETE as activityDesignDelete,
  PATCH as activityDesignPatch,
} from "@/app/api/activity-designs/[id]/route";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { prisma } from "@/prisma/client";

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

function activityDesignRequest(
  id: string,
  method: "PATCH" | "DELETE",
  body?: Record<string, unknown>,
  cookie = "",
) {
  return new Request(`http://localhost:3000/api/activity-designs/${id}`, {
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

  it("edits an Activity Design and persists normalized values after reload", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const createResponse = await activityDesignsPost(
      activityDesignsRequest("POST", validActivityDesign, cookie),
    );
    const created = await createResponse.json();

    const response = await activityDesignPatch(
      activityDesignRequest(
        created.activityDesign.id,
        "PATCH",
        {
          activityDesignNo: "  AD-2026-002  ",
          title: "  Updated Nutrition Month  ",
          officeName: "  Municipal Health Office  ",
          aipReferenceCode: "  AIP-2026-099  ",
        },
        cookie,
      ),
      routeParams(created.activityDesign.id),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      activityDesign: {
        id: created.activityDesign.id,
        activityDesignNo: "ad-2026-002",
        fiscalYear: 2026,
        title: "Updated Nutrition Month",
        officeName: "Municipal Health Office",
        aipReferenceCode: "AIP-2026-099",
        activityCount: 0,
      },
    });

    const reloadResponse = await activityDesignsGet(
      activityDesignsRequest("GET", undefined, cookie),
    );

    expect(await reloadResponse.json()).toMatchObject({
      activityDesigns: [
        {
          activityDesignNo: "ad-2026-002",
          title: "Updated Nutrition Month",
          officeName: "Municipal Health Office",
          aipReferenceCode: "AIP-2026-099",
        },
      ],
    });
  });

  it("rejects a duplicate normalized Activity Design No. during edit", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const firstResponse = await activityDesignsPost(
      activityDesignsRequest("POST", validActivityDesign, cookie),
    );
    const first = await firstResponse.json();
    const secondResponse = await activityDesignsPost(
      activityDesignsRequest(
        "POST",
        { ...validActivityDesign, activityDesignNo: "AD-2026-002" },
        cookie,
      ),
    );
    const second = await secondResponse.json();

    const response = await activityDesignPatch(
      activityDesignRequest(
        second.activityDesign.id,
        "PATCH",
        {
          activityDesignNo: "  ad-2026-001  ",
          title: "Should not be saved",
          officeName: validActivityDesign.officeName,
          aipReferenceCode: null,
        },
        cookie,
      ),
      routeParams(second.activityDesign.id),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "An Activity Design with that number already exists.",
      fields: {
        activityDesignNo: [
          "An Activity Design with that number already exists.",
        ],
      },
    });
    await expect(
      prisma.activityDesign.findUnique({
        where: { id: second.activityDesign.id },
      }),
    ).resolves.toMatchObject({
      activityDesignNo: "ad-2026-002",
      title: validActivityDesign.title,
    });
    await expect(
      prisma.activityDesign.findUnique({
        where: { id: first.activityDesign.id },
      }),
    ).resolves.toMatchObject({ activityDesignNo: "ad-2026-001" });
  });

  it.each([
    ["a blank Activity Design No.", { activityDesignNo: " " }, "activityDesignNo"],
    ["a blank title", { title: "\t" }, "title"],
    ["a blank office", { officeName: "  " }, "officeName"],
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
    "rejects %s during edit with a clear field error",
    async (_description, invalidFields, expectedField) => {
      await createStaffAccount();
      const cookie = await cookieForStaff();
      const createResponse = await activityDesignsPost(
        activityDesignsRequest("POST", validActivityDesign, cookie),
      );
      const created = await createResponse.json();

      const response = await activityDesignPatch(
        activityDesignRequest(
          created.activityDesign.id,
          "PATCH",
          {
            activityDesignNo: "AD-2026-002",
            title: "Updated title",
            officeName: "Updated office",
            aipReferenceCode: "AIP-2026-002",
            ...invalidFields,
          },
          cookie,
        ),
        routeParams(created.activityDesign.id),
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toBe(
        "Please correct the highlighted Activity Design fields.",
      );
      expect(payload.fields).toHaveProperty(expectedField);
      await expect(
        prisma.activityDesign.findUnique({
          where: { id: created.activityDesign.id },
        }),
      ).resolves.toMatchObject({ activityDesignNo: "ad-2026-001" });
    },
  );

  it("requires authentication for editing and deleting", async () => {
    await createStaffAccount();
    const createResponse = await activityDesignsPost(
      activityDesignsRequest("POST", validActivityDesign, await cookieForStaff()),
    );
    const created = await createResponse.json();

    const editResponse = await activityDesignPatch(
      activityDesignRequest(
        created.activityDesign.id,
        "PATCH",
        {
          activityDesignNo: "AD-2026-002",
          title: validActivityDesign.title,
          officeName: validActivityDesign.officeName,
          aipReferenceCode: null,
        },
      ),
      routeParams(created.activityDesign.id),
    );
    const deleteResponse = await activityDesignDelete(
      activityDesignRequest(created.activityDesign.id, "DELETE"),
      routeParams(created.activityDesign.id),
    );

    expect(editResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
    expect(await prisma.activityDesign.count()).toBe(1);
  });

  it("deletes an Activity Design without Activities", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const createResponse = await activityDesignsPost(
      activityDesignsRequest("POST", validActivityDesign, cookie),
    );
    const created = await createResponse.json();

    const response = await activityDesignDelete(
      activityDesignRequest(created.activityDesign.id, "DELETE", undefined, cookie),
      routeParams(created.activityDesign.id),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(await prisma.activityDesign.count()).toBe(0);
  });

  it("blocks deleting an Activity Design with Activities and preserves its children", async () => {
    await createStaffAccount();
    const cookie = await cookieForStaff();
    const createResponse = await activityDesignsPost(
      activityDesignsRequest("POST", validActivityDesign, cookie),
    );
    const created = await createResponse.json();
    const activity = await prisma.activity.create({
      data: {
        id: "blocking-activity",
        activityDesignId: created.activityDesign.id,
        name: "Existing activity",
        scheduledDate: new Date("2026-09-01T00:00:00.000Z"),
      },
    });

    const response = await activityDesignDelete(
      activityDesignRequest(created.activityDesign.id, "DELETE", undefined, cookie),
      routeParams(created.activityDesign.id),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        "This Activity Design cannot be deleted while it has Activities. Remove its Activities first.",
      activityCount: 1,
    });
    await expect(
      prisma.activity.findUnique({ where: { id: activity.id } }),
    ).resolves.toMatchObject({ activityDesignId: created.activityDesign.id });
    expect(await prisma.activityDesign.count()).toBe(1);
  });
});
