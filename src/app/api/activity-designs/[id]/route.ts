import {
  deleteActivityDesign,
  getActivityDesign,
  updateActivityDesign,
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

type ActivityDesignRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: ActivityDesignRouteContext,
) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  const { id } = await params;
  const activityDesign = await getActivityDesign(id);

  if (!activityDesign) {
    return Response.json(
      { error: "The Activity Design could not be found." },
      { status: 404 },
    );
  }

  return Response.json({ activityDesign });
}

export async function PATCH(
  request: Request,
  { params }: ActivityDesignRouteContext,
) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  const { id } = await params;
  const result = await updateActivityDesign(id, await readJson(request));

  if (!result.ok) {
    const status =
      result.kind === "duplicate"
        ? 409
        : result.kind === "not-found"
          ? 404
          : 400;

    return Response.json(
      { error: result.error, fields: result.fields },
      { status },
    );
  }

  return Response.json({ activityDesign: result.activityDesign });
}

export async function DELETE(
  request: Request,
  { params }: ActivityDesignRouteContext,
) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  const { id } = await params;
  const result = await deleteActivityDesign(id);

  if (!result.ok) {
    return Response.json(
      {
        error: result.error,
        ...(result.activityCount === undefined
          ? {}
          : { activityCount: result.activityCount }),
      },
      { status: result.kind === "not-found" ? 404 : 409 },
    );
  }

  return new Response(null, { status: 204 });
}
