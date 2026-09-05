import "server-only";

import { prisma } from "@/prisma/client";

export async function findMasterDataActorRole(actorId: string) {
  return prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });
}
