import {
  createActivityDesign,
  listActivityDesigns,
} from "@/features/activity-planning/server";
import { auth } from "@/server/auth";

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function requireAuthenticated(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
}

export async function GET(request: Request) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  return Response.json({ activityDesigns: await listActivityDesigns() });
}

export async function POST(request: Request) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  const result = await createActivityDesign(await readJson(request));

  if (!result.ok) {
    return Response.json(
      { error: result.error, fields: result.fields },
      { status: result.kind === "duplicate" ? 409 : 400 },
    );
  }

  return Response.json(
    { activityDesign: result.activityDesign },
    { status: 201 },
  );
}
