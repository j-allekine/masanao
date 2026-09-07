import "server-only";

import type { CurrentActor } from "@/server/auth";

import { findMasterDataActorRole } from "../db/authorization";

export async function isAdministrator(actor: CurrentActor) {
  const user = await findMasterDataActorRole(actor.id);
  return user?.role === "admin";
}
