import "server-only";

import type { CurrentActor } from "@/server/auth";

import { findUnitActorRole } from "../db/units";

export async function isAdministrator(actor: CurrentActor) {
  const user = await findUnitActorRole(actor.id);
  return user?.role === "admin";
}
