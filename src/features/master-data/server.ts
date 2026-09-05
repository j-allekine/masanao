import "server-only";

import type { CurrentActor } from "@/server/auth";

import { createOfficeCommand } from "./server/commands/create-office";
import { createUnitCommand } from "./server/commands/create-unit";
import { deleteOfficeCommand } from "./server/commands/delete-office";
import { deleteUnitCommand } from "./server/commands/delete-unit";
import { setOfficeActiveCommand } from "./server/commands/set-office-active";
import { setUnitActiveCommand } from "./server/commands/set-unit-active";
import { updateOfficeCommand } from "./server/commands/update-office";
import { updateUnitCommand } from "./server/commands/update-unit";
import { isAdministrator } from "./server/policies/authorization";
import { listOffices as listOfficesQuery } from "./server/queries/list-offices";
import { listUnits as listUnitsQuery } from "./server/queries/list-units";
import type {
  OfficeCreateResult,
  OfficeDeleteResult,
  OfficeLifecycleResult,
  OfficeUpdateResult,
  UnitCreateResult,
  UnitDeleteResult,
  UnitLifecycleResult,
  UnitUpdateResult,
} from "./types";

export type {
  OfficeCreateResult,
  OfficeDeleteResult,
  OfficeLifecycleResult,
  OfficeListItem,
  OfficeUpdateResult,
  UnitCreateResult,
  UnitDeleteResult,
  UnitLifecycleResult,
  UnitListItem,
  UnitUpdateResult,
} from "./types";

export async function listUnits() {
  return listUnitsQuery();
}

export async function listOffices() {
  return listOfficesQuery();
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

export async function createOffice(
  actor: CurrentActor,
  input: unknown,
): Promise<OfficeCreateResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) {
    return { ...authorizationFailure, fields: {} };
  }

  return createOfficeCommand(input);
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

export async function updateOffice(
  actor: CurrentActor,
  id: string,
  input: unknown,
): Promise<OfficeUpdateResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) {
    return { ...authorizationFailure, fields: {} };
  }

  return updateOfficeCommand(id, input);
}

export async function setOfficeActive(
  actor: CurrentActor,
  id: string,
  isActive: boolean,
): Promise<OfficeLifecycleResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  return setOfficeActiveCommand(id, isActive);
}

export async function deleteOffice(
  actor: CurrentActor,
  id: string,
): Promise<OfficeDeleteResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  return deleteOfficeCommand(id);
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
