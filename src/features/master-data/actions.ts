"use server";

import { executeCreateUnit } from "./server/actions/create-unit";
import { executeDeleteUnit } from "./server/actions/delete-unit";
import { executeSetUnitActive } from "./server/actions/set-unit-active";
import { executeUpdateUnit } from "./server/actions/update-unit";
import type {
  UnitDeleteActionState,
  UnitFormActionState,
  UnitLifecycleActionState,
} from "./types";

export async function createUnitAction(
  formData: FormData,
): Promise<UnitFormActionState> {
  return executeCreateUnit(formData);
}

export async function updateUnitAction(
  formData: FormData,
): Promise<UnitFormActionState> {
  return executeUpdateUnit(formData);
}

export async function setUnitActiveAction(
  id: string,
  active: boolean,
): Promise<UnitLifecycleActionState> {
  return executeSetUnitActive(id, active);
}

export async function deleteUnitAction(
  id: string,
): Promise<UnitDeleteActionState> {
  return executeDeleteUnit(id);
}
