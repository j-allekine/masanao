import "server-only";

import type { CurrentActor } from "@/server/auth";

import { createUnitCommand } from "./server/commands/create-unit";
import { deleteUnitCommand } from "./server/commands/delete-unit";
import { setUnitActiveCommand } from "./server/commands/set-unit-active";
import { updateUnitCommand } from "./server/commands/update-unit";
import { isAdministrator } from "./server/policies/authorization";
import { listUnits as listUnitsQuery } from "./server/queries/list-units";
import { listVendors as listVendorsQuery } from "./server/queries/list-vendors";
import type {
  UnitCreateResult,
  UnitDeleteResult,
  UnitLifecycleResult,
  UnitUpdateResult,
} from "./types";

export type {
  UnitCreateResult,
  UnitDeleteResult,
  UnitLifecycleResult,
  UnitListItem,
  VendorListItem,
  UnitUpdateResult,
} from "./types";

export async function listUnits() {
  return listUnitsQuery();
}

export async function listVendors() {
  return listVendorsQuery();
}

async function authorizeAdministrator(actor: CurrentActor) {
  if (!(await isAdministrator(actor))) {
    return {
      ok: false as const,
      kind: "forbidden" as const,
      error: "Administrator access required",
    };
  }

  return null;
}

export async function canManageUnits(actor: CurrentActor) {
  return isAdministrator(actor);
}

export async function createUnit(
  actor: CurrentActor,
  input: unknown,
): Promise<UnitCreateResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) {
    return { ...authorizationFailure, fields: {} };
  }

  return createUnitCommand(input);
}

export async function updateUnit(
  actor: CurrentActor,
  id: string,
  input: unknown,
): Promise<UnitUpdateResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) {
    return { ...authorizationFailure, fields: {} };
  }

  return updateUnitCommand(id, input);
}

export async function setUnitActive(
  actor: CurrentActor,
  id: string,
  active: boolean,
): Promise<UnitLifecycleResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  return setUnitActiveCommand(id, active);
}

export async function deleteUnit(
  actor: CurrentActor,
  id: string,
): Promise<UnitDeleteResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  return deleteUnitCommand(id);
}
