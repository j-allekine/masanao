"use server";

import { executeCreateOffice } from "./server/actions/create-office";
import { executeCreateUnit } from "./server/actions/create-unit";
import { executeDeleteOffice } from "./server/actions/delete-office";
import { executeDeleteUnit } from "./server/actions/delete-unit";
import { executeSetOfficeActive } from "./server/actions/set-office-active";
import { executeSetUnitActive } from "./server/actions/set-unit-active";
import { executeUpdateOffice } from "./server/actions/update-office";
import { executeUpdateUnit } from "./server/actions/update-unit";
import type {
  OfficeFormActionState,
  OfficeDeleteActionState,
  OfficeLifecycleActionState,
  UnitDeleteActionState,
  UnitFormActionState,
  UnitLifecycleActionState,
} from "./types";

export async function createUnitAction(
  formData: FormData,
): Promise<UnitFormActionState> {
  return executeCreateUnit(formData);
}

export async function createOfficeAction(
  formData: FormData,
): Promise<OfficeFormActionState> {
  return executeCreateOffice(formData);
}

export async function updateUnitAction(
  formData: FormData,
): Promise<UnitFormActionState> {
  return executeUpdateUnit(formData);
}

export async function updateOfficeAction(
  formData: FormData,
): Promise<OfficeFormActionState> {
  return executeUpdateOffice(formData);
}

export async function setOfficeActiveAction(
  id: string,
  isActive: boolean,
): Promise<OfficeLifecycleActionState> {
  return executeSetOfficeActive(id, isActive);
}

export async function deleteOfficeAction(
  id: string,
): Promise<OfficeDeleteActionState> {
  return executeDeleteOffice(id);
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
