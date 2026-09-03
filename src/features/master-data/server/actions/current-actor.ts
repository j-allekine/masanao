import "server-only";

import { headers } from "next/headers";

import type { CurrentActor } from "@/server/auth";
import { auth } from "@/server/auth";

export async function getCurrentUnitActor(): Promise<CurrentActor | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    username: session.user.username ?? null,
  };
}
