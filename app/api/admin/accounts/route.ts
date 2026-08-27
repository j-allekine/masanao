import { hashPassword } from "better-auth/crypto";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdministrator } from "@/lib/admin-authorization";
import { z } from "zod";

const credentialIssuer = "local:credential";
const credentialProvider = "credential";
const minPasswordLength = 8;
const maxPasswordLength = 128;

const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_.]+$/)
  .transform((username) => username.toLowerCase());

const createAccountSchema = z.object({
  username: usernameSchema,
  password: z.string().min(minPasswordLength).max(maxPasswordLength),
  name: z.string().trim().min(1).max(100).optional(),
});

const resetPasswordSchema = z.object({
  username: usernameSchema,
  password: z.string().min(minPasswordLength).max(maxPasswordLength),
});

const disableAccountSchema = z.object({
  username: usernameSchema,
});

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function invalidAccountDetails() {
  return Response.json({ error: "Invalid account details" }, { status: 400 });
}

export async function POST(request: Request) {
  const authorizationResponse = await requireAdministrator(request);
  if (authorizationResponse) return authorizationResponse;

  const parsedBody = createAccountSchema.safeParse(await readJson(request));
  if (!parsedBody.success) return invalidAccountDetails();

  const { username, password, name } = parsedBody.data;
  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  try {
    const account = await prisma.user.create({
      data: {
        id: userId,
        name: name ?? username,
        email: `${username}@internal.masanao`,
        username,
        role: "staff",
        accounts: {
          create: {
            id: crypto.randomUUID(),
            issuer: credentialIssuer,
            accountId: userId,
            providerId: credentialProvider,
            password: passwordHash,
          },
        },
      },
      select: {
        name: true,
        role: true,
        username: true,
      },
    });

    return Response.json({ account }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "An account with that username already exists" },
        { status: 409 },
      );
    }

    throw error;
  }
}

export async function PATCH(request: Request) {
  const authorizationResponse = await requireAdministrator(request);
  if (authorizationResponse) return authorizationResponse;

  const parsedBody = resetPasswordSchema.safeParse(await readJson(request));
  if (!parsedBody.success) return invalidAccountDetails();

  const { username, password } = parsedBody.data;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });

  if (!user) {
    return Response.json({ error: "Account not found" }, { status: 404 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.account.upsert({
    where: {
      issuer_accountId: {
        issuer: credentialIssuer,
        accountId: user.id,
      },
    },
    update: { password: passwordHash },
    create: {
      id: crypto.randomUUID(),
      issuer: credentialIssuer,
      accountId: user.id,
      providerId: credentialProvider,
      userId: user.id,
      password: passwordHash,
    },
  });

  return Response.json({ account: { username: user.username } });
}

export async function DELETE(request: Request) {
  const authorizationResponse = await requireAdministrator(request);
  if (authorizationResponse) return authorizationResponse;

  const parsedBody = disableAccountSchema.safeParse(await readJson(request));
  if (!parsedBody.success) return invalidAccountDetails();

  const { username } = parsedBody.data;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, role: true, username: true },
  });

  if (!user || user.role !== "staff") {
    return Response.json({ error: "Account not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { disabled: true },
  });

  return Response.json({
    account: { username: user.username, disabled: true },
  });
}
