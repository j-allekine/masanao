import "server-only";

import { getCurrentActor } from "@/server/auth";
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

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function requireAdministrator(request: Request) {
  const actor = await getCurrentActor(request);

  if (!actor) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  if (!(await isAdministrator(actor))) {
    return Response.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  }

  return null;
}

function invalidAccountDetails() {
  return Response.json({ error: "Invalid account details" }, { status: 400 });
}

export async function createStaffAccount(request: Request) {
  const authorizationResponse = await requireAdministrator(request);
  if (authorizationResponse) return authorizationResponse;

  const parsedBody = createStaffAccountSchema.safeParse(await readJson(request));
  if (!parsedBody.success) return invalidAccountDetails();

  try {
    const account = await createStaffAccountCommand(parsedBody.data);
    return Response.json({ account }, { status: 201 });
  } catch (error) {
    if (error instanceof AccountAlreadyExistsError) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    throw error;
  }
}

export async function resetStaffPassword(request: Request) {
  const authorizationResponse = await requireAdministrator(request);
  if (authorizationResponse) return authorizationResponse;

  const parsedBody = resetAccountPasswordSchema.safeParse(
    await readJson(request),
  );
  if (!parsedBody.success) return invalidAccountDetails();

  try {
    const account = await resetAccountPassword(parsedBody.data);
    return Response.json({ account: { username: account.username } });
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}

export async function disableStaffAccount(request: Request) {
  const authorizationResponse = await requireAdministrator(request);
  if (authorizationResponse) return authorizationResponse;

  const parsedBody = disableStaffAccountSchema.safeParse(
    await readJson(request),
  );
  if (!parsedBody.success) return invalidAccountDetails();

  try {
    const account = await disableStaffAccountCommand(parsedBody.data);
    return Response.json({
      account: { username: account.username, disabled: true },
    });
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}
