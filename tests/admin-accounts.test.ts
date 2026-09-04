import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "better-auth/crypto";
import {
  createStaffAccount as createStaffAccountFeature,
} from "@/features/access-management/server";
import {
  DELETE as adminAccountsDelete,
  PATCH as adminAccountsPatch,
  POST as adminAccountsPost,
} from "@/app/api/admin/accounts/route";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { prisma } from "@/prisma/client";
import { getCurrentActor, type CurrentActor } from "@/server/auth";

const adminPassword = "administrator-password";
const originalStaffPassword = "original-staff-password";
const replacementStaffPassword = "replacement-staff-password";

const adminActor: CurrentActor = {
  id: "admin-user",
  name: "municipal.admin",
  username: "municipal.admin",
};

async function createAccount({
  id,
  username,
  role = "staff",
  password,
}: {
  id: string;
  username: string;
  role?: string;
  password: string;
}) {
  await prisma.user.create({
    data: {
      id,
      name: username,
      email: `${username}@internal.masanao`,
      username,
      role,
      accounts: {
        create: {
          id: `${id}-credential-account`,
          issuer: "local:credential",
          accountId: id,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
  });
}

async function signInWithUsername(username: string, password: string) {
  return authPost(
    new Request("http://localhost:3000/api/auth/sign-in/username", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ username, password }),
    }),
  );
}

async function cookieFor(username: string, password: string) {
  const response = await signInWithUsername(username, password);
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

function adminRequest(
  method: "DELETE" | "PATCH" | "POST",
  body: Record<string, string>,
  cookie = "",
) {
  const request = new Request("http://localhost:3000/api/admin/accounts", {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

  if (method === "POST") return adminAccountsPost(request);
  if (method === "DELETE") return adminAccountsDelete(request);
  return adminAccountsPatch(request);
}

describe("administrator account management", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("lets an administrator create a username-only staff account", async () => {
    await createAccount({
      id: "admin-user",
      username: "municipal.admin",
      role: "admin",
      password: adminPassword,
    });

    const response = await adminRequest(
      "POST",
      { username: "new.staff", password: originalStaffPassword },
      await cookieFor("municipal.admin", adminPassword),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      account: {
        name: "new.staff",
        role: "staff",
        username: "new.staff",
      },
    });

    const createdUser = await prisma.user.findUnique({
      where: { username: "new.staff" },
      include: { accounts: true },
    });
    expect(createdUser?.email).toBe("new.staff@internal.masanao");
    expect(createdUser?.role).toBe("staff");
    expect(createdUser?.accounts[0]?.password).not.toBe(originalStaffPassword);

    const signInResponse = await signInWithUsername(
      "new.staff",
      originalStaffPassword,
    );
    expect(signInResponse.status).toBe(200);
  });

  it("exposes account creation through a transport-neutral feature gateway", async () => {
    await createAccount({
      id: "admin-user",
      username: "municipal.admin",
      role: "admin",
      password: adminPassword,
    });

    const result = await createStaffAccountFeature(adminActor, {
      username: "gateway.staff",
      password: originalStaffPassword,
    });

    expect(result).toEqual({
      ok: true,
      account: {
        name: "gateway.staff",
        role: "staff",
        username: "gateway.staff",
      },
    });
  });

  it("keeps administrator authorization inside the feature gateway", async () => {
    await createAccount({
      id: "staff-user",
      username: "kitchen.staff",
      password: originalStaffPassword,
    });

    const result = await createStaffAccountFeature(
      {
        id: "staff-user",
        name: "kitchen.staff",
        username: "kitchen.staff",
      },
      {
        username: "blocked.staff",
        password: replacementStaffPassword,
      },
    );

    expect(result).toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
  });

  it("lets an administrator reset a staff password without email", async () => {
    await createAccount({
      id: "admin-user",
      username: "municipal.admin",
      role: "admin",
      password: adminPassword,
    });
    await createAccount({
      id: "staff-user",
      username: "kitchen.staff",
      password: originalStaffPassword,
    });

    const response = await adminRequest(
      "PATCH",
      { username: "kitchen.staff", password: replacementStaffPassword },
      await cookieFor("municipal.admin", adminPassword),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      account: { username: "kitchen.staff" },
    });
    expect(
      (await signInWithUsername("kitchen.staff", originalStaffPassword)).status,
    ).toBe(401);
    expect(
      (await signInWithUsername("kitchen.staff", replacementStaffPassword))
        .status,
    ).toBe(200);
  });

  it("lets an administrator disable a staff account without revoking its session", async () => {
    await createAccount({
      id: "admin-user",
      username: "municipal.admin",
      role: "admin",
      password: adminPassword,
    });
    await createAccount({
      id: "staff-user",
      username: "kitchen.staff",
      password: originalStaffPassword,
    });

    const adminCookie = await cookieFor("municipal.admin", adminPassword);
    const staffCookie = await cookieFor("kitchen.staff", originalStaffPassword);

    const response = await adminRequest(
      "DELETE",
      { username: "kitchen.staff" },
      adminCookie,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      account: { username: "kitchen.staff", disabled: true },
    });
    expect(
      (
        await prisma.user.findUnique({
          where: { username: "kitchen.staff" },
          select: { disabled: true },
        })
      )?.disabled,
    ).toBe(true);
    expect(await prisma.session.count()).toBe(2);

    const existingSessionActor = await getCurrentActor(
      new Request("http://localhost:3000/overview", {
        headers: { cookie: staffCookie },
      }),
    );
    expect(existingSessionActor).toEqual({
      id: "staff-user",
      name: "kitchen.staff",
      username: "kitchen.staff",
    });

    const invalidPasswordResponse = await signInWithUsername(
      "kitchen.staff",
      "wrong-password",
    );
    const disabledAccountResponse = await signInWithUsername(
      "kitchen.staff",
      originalStaffPassword,
    );

    expect(disabledAccountResponse.status).toBe(401);
    expect(disabledAccountResponse.headers.get("set-cookie")).toBeNull();
    expect(await disabledAccountResponse.json()).toEqual(
      await invalidPasswordResponse.json(),
    );
    expect(await prisma.session.count()).toBe(2);
  });

  it("does not disable administrators or unknown accounts", async () => {
    await createAccount({
      id: "admin-user",
      username: "municipal.admin",
      role: "admin",
      password: adminPassword,
    });

    const adminCookie = await cookieFor("municipal.admin", adminPassword);

    const administratorResponse = await adminRequest(
      "DELETE",
      { username: "municipal.admin" },
      adminCookie,
    );
    const unknownResponse = await adminRequest(
      "DELETE",
      { username: "missing.staff" },
      adminCookie,
    );

    expect(administratorResponse.status).toBe(404);
    expect(unknownResponse.status).toBe(404);
    expect(
      (
        await prisma.user.findUnique({
          where: { username: "municipal.admin" },
          select: { disabled: true },
        })
      )?.disabled,
    ).toBe(false);
  });

  it("restricts account creation and password resets to administrators", async () => {
    await createAccount({
      id: "staff-user",
      username: "kitchen.staff",
      password: originalStaffPassword,
    });

    const requests = [
      ["POST", {}, ""],
      [
        "POST",
        { username: "another.staff", password: replacementStaffPassword },
        await cookieFor("kitchen.staff", originalStaffPassword),
      ],
      [
        "PATCH",
        { username: "kitchen.staff", password: replacementStaffPassword },
        "",
      ],
      [
        "PATCH",
        { username: "kitchen.staff", password: replacementStaffPassword },
        await cookieFor("kitchen.staff", originalStaffPassword),
      ],
      [
        "DELETE",
        { username: "kitchen.staff" },
        "",
      ],
      [
        "DELETE",
        { username: "kitchen.staff" },
        await cookieFor("kitchen.staff", originalStaffPassword),
      ],
    ] as const;

    for (const [method, body, cookie] of requests) {
      const response = await adminRequest(method, body, cookie);
      expect(response.status, `${method} ${cookie ? "staff" : "anonymous"}`).toBe(
        cookie ? 403 : 401,
      );
    }
  });
});
