import "server-only";

import { hashPassword } from "better-auth/crypto";
import {
  createStaffAccountRecord,
  disableStaffAccountRecord,
  findAccountForPasswordReset,
  findStaffAccountToDisable,
  isUniqueConstraintViolation,
  updateCredentialPassword,
} from "../db/accounts";
import type {
  CreateStaffAccountInput,
  DisableStaffAccountInput,
  ResetAccountPasswordInput,
} from "../../schemas/accounts";

export class AccountAlreadyExistsError extends Error {
  constructor() {
    super("An account with that username already exists");
    this.name = "AccountAlreadyExistsError";
  }
}

export class AccountNotFoundError extends Error {
  constructor() {
    super("Account not found");
    this.name = "AccountNotFoundError";
  }
}

export async function createStaffAccount(input: CreateStaffAccountInput) {
  const passwordHash = await hashPassword(input.password);

  try {
    return await createStaffAccountRecord({
      id: crypto.randomUUID(),
      username: input.username,
      name: input.name ?? input.username,
      passwordHash,
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new AccountAlreadyExistsError();
    }

    throw error;
  }
}

export async function resetAccountPassword(
  input: ResetAccountPasswordInput,
) {
  const user = await findAccountForPasswordReset(input.username);

  if (!user) {
    throw new AccountNotFoundError();
  }

  const passwordHash = await hashPassword(input.password);
  await updateCredentialPassword(user.id, passwordHash);

  return user;
}

export async function disableStaffAccount(
  input: DisableStaffAccountInput,
) {
  const user = await findStaffAccountToDisable(input.username);

  if (!user || user.role !== "staff") {
    throw new AccountNotFoundError();
  }

  await disableStaffAccountRecord(user.id);

  return user;
}
