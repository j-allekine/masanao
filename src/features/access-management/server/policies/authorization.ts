import "server-only";

import type { CurrentActor } from "@/server/auth";
import { findActorRole } from "../db/accounts";

export async function isAdministrator(actor: CurrentActor) {
  const user = await findActorRole(actor.id);
  return user?.role === "admin";
}
