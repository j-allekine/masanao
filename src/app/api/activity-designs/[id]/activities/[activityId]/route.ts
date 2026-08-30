import {
  deleteActivity,
  updateActivity,
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

type ActivityRouteContext = {
  params: Promise<{ id: string; activityId: string }>;
};

export async function PATCH(
  request: Request,
  { params }: ActivityRouteContext,
) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  const { id, activityId } = await params;
  const result = await updateActivity(id, activityId, await readJson(request));

  if (!result.ok) {
    return Response.json(
      { error: result.error, fields: result.fields },
      { status: result.kind === "not-found" ? 404 : 400 },
    );
  }

  return Response.json({ activity: result.activity });
}

export async function DELETE(
  request: Request,
  { params }: ActivityRouteContext,
) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  const { id, activityId } = await params;
  const result = await deleteActivity(id, activityId);

  if (!result.ok) {
    return Response.json(
      {
        error: result.error,
        ...(result.mealScheduleCount === undefined
          ? {}
          : { mealScheduleCount: result.mealScheduleCount }),
      },
      { status: result.kind === "not-found" ? 404 : 409 },
    );
  }

  return new Response(null, { status: 204 });
}
