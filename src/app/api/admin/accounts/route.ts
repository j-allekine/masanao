import {
  createStaffAccount,
  disableStaffAccount,
  resetStaffPassword,
} from "@/features/access-management/server";
import { getCurrentActor, type CurrentActor } from "@/server/auth";

type AuthenticationResult =
  | { ok: false; response: Response }
  | { ok: true; actor: CurrentActor };

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function requireAuthenticated(
  request: Request,
): Promise<AuthenticationResult> {
  const actor = await getCurrentActor(request);

  if (!actor) {
    return {
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  return { ok: true, actor };
}

function statusForFailure(
  kind: "forbidden" | "validation" | "duplicate" | "not-found",
) {
  if (kind === "forbidden") return 403;
  if (kind === "validation") return 400;
  if (kind === "duplicate") return 409;
  return 404;
}

export async function POST(request: Request): Promise<Response> {
  const authentication = await requireAuthenticated(request);
  if (!authentication.ok) return authentication.response;

  const result = await createStaffAccount(
    authentication.actor,
    await readJson(request),
  );

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: statusForFailure(result.kind) },
    );
  }

  return Response.json({ account: result.account }, { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  const authentication = await requireAuthenticated(request);
  if (!authentication.ok) return authentication.response;

  const result = await resetStaffPassword(
    authentication.actor,
    await readJson(request),
  );

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: statusForFailure(result.kind) },
    );
  }

  return Response.json({ account: result.account });
}

export async function DELETE(request: Request): Promise<Response> {
  const authentication = await requireAuthenticated(request);
  if (!authentication.ok) return authentication.response;

  const result = await disableStaffAccount(
    authentication.actor,
    await readJson(request),
  );

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: statusForFailure(result.kind) },
    );
  }

  return Response.json({ account: result.account });
}
