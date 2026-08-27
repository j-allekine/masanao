import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "better-auth/crypto";
import { POST as authPost } from "@/app/api/auth/[...all]/route";
import { GET as operationsGet } from "@/app/api/operations/route";
import { prisma } from "@/lib/prisma";

const staffPassword = "correct-horse-battery-staple";

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

async function signInWithUsername(username: string, password: string) {
  return postAuth("/sign-in/username", { username, password });
}

async function postAuth(path: string, body: Record<string, string>) {
  return authPost(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("username authentication API", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("rejects an unassigned username at the BetterAuth endpoint", async () => {
    const response = await signInWithUsername("kitchen.staff", staffPassword);

    expect(response.status).toBe(401);
  });

  it("creates a session for a valid assigned username and password", async () => {
    await createStaffAccount();

    const response = await signInWithUsername("kitchen.staff", staffPassword);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "better-auth.session_token=",
    );
    expect(await prisma.session.count()).toBe(1);

    const payload = await response.json();
    expect(payload.user.username).toBe("kitchen.staff");
  });

  it("uses the same generic failure for an unknown username and a bad password", async () => {
    await createStaffAccount();

    const knownUsernameResponse = await signInWithUsername(
      "kitchen.staff",
      "wrong-password",
    );
    const unknownUsernameResponse = await signInWithUsername(
      "missing.staff",
      staffPassword,
    );

    expect(knownUsernameResponse.status).toBe(401);
    expect(unknownUsernameResponse.status).toBe(401);
    expect(await knownUsernameResponse.json()).toEqual(
      await unknownUsernameResponse.json(),
    );
    expect(knownUsernameResponse.headers.get("set-cookie")).toBeNull();
    expect(unknownUsernameResponse.headers.get("set-cookie")).toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });

  it("rejects access to Masanao operations without an authenticated session", async () => {
    const response = await operationsGet(
      new Request("http://localhost:3000/api/operations"),
    );

    expect(response.status).toBe(401);
  });

  it("allows an authenticated staff member to access Masanao operations", async () => {
    await createStaffAccount();

    const signInResponse = await signInWithUsername(
      "kitchen.staff",
      staffPassword,
    );
    const cookie = signInResponse.headers.get("set-cookie");

    const response = await operationsGet(
      new Request("http://localhost:3000/api/operations", {
        headers: {
          cookie: cookie?.split(";")[0] ?? "",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authenticated: true,
      user: {
        id: "staff-user",
        name: "Kitchen Staff",
        username: "kitchen.staff",
      },
    });
  });

  it("keeps email, social, registration, and recovery auth paths unavailable", async () => {
    const disabledPaths = [
      ["/sign-in/email", { email: "staff@example.com", password: staffPassword }],
      [
        "/sign-in/social",
        { provider: "google", callbackURL: "http://localhost:3000" },
      ],
      [
        "/sign-up/email",
        {
          name: "Public Staff",
          email: "public@example.com",
          password: staffPassword,
        },
      ],
      ["/request-password-reset", { email: "staff@example.com" }],
      ["/reset-password", { newPassword: staffPassword }],
      ["/send-verification-email", { email: "staff@example.com" }],
      ["/verify-email", { token: "unused-token" }],
      ["/change-email", { newEmail: "new@example.com" }],
    ] as const;

    for (const [path, body] of disabledPaths) {
      const response = await postAuth(path, body);

      expect(response.status, path).toBe(404);
    }
  });
});
