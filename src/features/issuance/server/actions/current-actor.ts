import "server-only";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
export async function getCurrentIssuanceActor() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? { id: session.user.id, name: session.user.name, username: session.user.username ?? null } : null;
}
