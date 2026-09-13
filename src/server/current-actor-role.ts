import "server-only";

import { prisma } from "@/prisma/client";

export async function isCurrentActorAdministrator(actorId: string) {
  const user = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });

  return user?.role === "admin";
}
