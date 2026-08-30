import {
  deleteMealSchedule,
  updateMealSchedule,
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

type MealScheduleRouteContext = {
  params: Promise<{
    id: string;
    activityId: string;
    scheduleId: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: MealScheduleRouteContext,
) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  const { id, activityId, scheduleId } = await params;
  const result = await updateMealSchedule(
    id,
    activityId,
    scheduleId,
    await readJson(request),
  );

  if (!result.ok) {
    return Response.json(
      { error: result.error, fields: result.fields },
      { status: result.kind === "not-found" ? 404 : 400 },
    );
  }

  return Response.json({ mealSchedule: result.mealSchedule });
}

export async function DELETE(
  request: Request,
  { params }: MealScheduleRouteContext,
) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  const { id, activityId, scheduleId } = await params;
  const result = await deleteMealSchedule(id, activityId, scheduleId);

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: result.kind === "not-found" ? 404 : 409 },
    );
  }

  return new Response(null, { status: 204 });
}
