import "server-only";

import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";

const credentialIssuer = "local:credential";
const credentialProvider = "credential";

export async function findActorRole(actorId: string) {
  return prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });
}

export async function createStaffAccountRecord({
  id,
  username,
  name,
  passwordHash,
}: {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      id,
      name,
      email: `${username}@internal.masanao`,
      username,
      role: "staff",
      accounts: {
        create: {
          id: crypto.randomUUID(),
          issuer: credentialIssuer,
          accountId: id,
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
}

export async function findAccountForPasswordReset(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });
}

export async function updateCredentialPassword(
  userId: string,
  passwordHash: string,
) {
  return prisma.account.upsert({
    where: {
      issuer_accountId: {
        issuer: credentialIssuer,
        accountId: userId,
      },
    },
    update: { password: passwordHash },
    create: {
      id: crypto.randomUUID(),
      issuer: credentialIssuer,
      accountId: userId,
      providerId: credentialProvider,
      userId,
      password: passwordHash,
    },
  });
}

export async function findStaffAccountToDisable(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: { id: true, role: true, username: true },
  });
}

export async function disableStaffAccountRecord(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { disabled: true },
  });
}

export function isUniqueConstraintViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
