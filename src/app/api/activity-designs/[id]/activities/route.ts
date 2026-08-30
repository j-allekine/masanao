import { createActivity } from "@/features/activity-planning/server";
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
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: ActivityRouteContext,
) {
  const authorizationResponse = await requireAuthenticated(request);
  if (authorizationResponse) return authorizationResponse;

  const { id } = await params;
  const result = await createActivity(id, await readJson(request));

  if (!result.ok) {
    return Response.json(
      { error: result.error, fields: result.fields },
      { status: result.kind === "not-found" ? 404 : 400 },
    );
  }

  return Response.json({ activity: result.activity }, { status: 201 });
}
