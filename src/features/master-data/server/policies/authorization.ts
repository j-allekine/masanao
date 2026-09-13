import "server-only";

import type { CurrentActor } from "@/server/auth";

import { isCurrentActorAdministrator } from "@/server/current-actor-role";

export async function isAdministrator(actor: CurrentActor) {
  return isCurrentActorAdministrator(actor.id);
}
