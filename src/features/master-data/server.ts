import "server-only";

import type { CurrentActor } from "@/server/auth";

import { createUnitCommand } from "./server/commands/create-unit";
import { updateUnitCommand } from "./server/commands/update-unit";
import { isAdministrator } from "./server/policies/authorization";
import { listUnits as listUnitsQuery } from "./server/queries/list-units";
import type {
  UnitCreateResult,
  UnitDeleteResult,
  UnitLifecycleResult,
  UnitUpdateResult,
} from "./types";

import {
  deleteUnitRecord,
  isRecordNotFound,
  setUnitActiveRecord,
} from "./server/db/units";

export type {
  UnitCreateResult,
  UnitDeleteResult,
  UnitLifecycleResult,
  UnitListItem,
  UnitUpdateResult,
} from "./types";

export async function listUnits() {
  return listUnitsQuery();
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

  try {
    return { ok: true, unit: await setUnitActiveRecord(id, active) };
  } catch (error) {
    if (isRecordNotFound(error)) {
      return {
        ok: false,
        kind: "not-found",
        error: "The Unit could not be found.",
      };
    }

    throw error;
  }
}

export async function deleteUnit(
  actor: CurrentActor,
  id: string,
): Promise<UnitDeleteResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  const result = await deleteUnitRecord(id);
  if (!result) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Unit could not be found.",
    };
  }

  if (!result.deleted) {
    return {
      ok: false,
      kind: "referenced",
      error:
        "This Unit cannot be deleted because it is already referenced by other records.",
    };
  }

  return { ok: true };
}
