import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  return Response.json({
    authenticated: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      username: session.user.username,
    },
  });
}
