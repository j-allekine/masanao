import "server-only";

import { cache } from "react";

import { prisma } from "@/prisma/client";

export const isCurrentActorAdministrator = cache(async (actorId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });

  return user?.role === "admin";
});
