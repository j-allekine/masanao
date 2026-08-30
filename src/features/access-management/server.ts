import "server-only";

import type { CurrentActor } from "@/server/auth";
import {
  createStaffAccountSchema,
  disableStaffAccountSchema,
  resetAccountPasswordSchema,
} from "./schemas/accounts";
import {
  AccountAlreadyExistsError,
  AccountNotFoundError,
  createStaffAccount as createStaffAccountCommand,
  disableStaffAccount as disableStaffAccountCommand,
  resetAccountPassword,
} from "./server/commands/accounts";
import { isAdministrator } from "./server/policies/authorization";

type AccessManagementFailure = {
  ok: false;
  kind: "forbidden" | "validation" | "duplicate" | "not-found";
  error: string;
};

async function authorizeAdministrator(
  actor: CurrentActor,
): Promise<AccessManagementFailure | null> {
  if (!(await isAdministrator(actor))) {
    return {
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    };
  }

  return null;
}

function invalidAccountDetails(): AccessManagementFailure {
  return {
    ok: false,
    kind: "validation",
    error: "Invalid account details",
  };
}

export async function createStaffAccount(
  actor: CurrentActor,
  input: unknown,
) {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  const parsedBody = createStaffAccountSchema.safeParse(input);
  if (!parsedBody.success) return invalidAccountDetails();

  try {
    const account = await createStaffAccountCommand(parsedBody.data);
    return { ok: true as const, account };
  } catch (error) {
    if (error instanceof AccountAlreadyExistsError) {
      return {
        ok: false as const,
        kind: "duplicate" as const,
        error: error.message,
      };
    }

    throw error;
  }
}

export async function resetStaffPassword(
  actor: CurrentActor,
  input: unknown,
) {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  const parsedBody = resetAccountPasswordSchema.safeParse(input);
  if (!parsedBody.success) return invalidAccountDetails();

  try {
    const account = await resetAccountPassword(parsedBody.data);
    return { ok: true as const, account: { username: account.username } };
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return {
        ok: false as const,
        kind: "not-found" as const,
        error: error.message,
      };
    }

    throw error;
  }
}

export async function disableStaffAccount(
  actor: CurrentActor,
  input: unknown,
) {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  const parsedBody = disableStaffAccountSchema.safeParse(input);
  if (!parsedBody.success) return invalidAccountDetails();

  try {
    const account = await disableStaffAccountCommand(parsedBody.data);
    return {
      ok: true as const,
      account: { username: account.username, disabled: true as const },
    };
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return {
        ok: false as const,
        kind: "not-found" as const,
        error: error.message,
      };
    }

    throw error;
  }
}
