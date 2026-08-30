import "server-only";

import { auth } from "@/server/auth";
import { prisma } from "@/prisma/client";

export async function requireAdministrator(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return Response.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  }
}
