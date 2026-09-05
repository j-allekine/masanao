"use server";

import { executeCreateUnit } from "./server/actions/create-unit";
import { executeDeleteUnit } from "./server/actions/delete-unit";
import { executeSetUnitActive } from "./server/actions/set-unit-active";
import { executeUpdateUnit } from "./server/actions/update-unit";
import { executeCreateVendor } from "./server/actions/create-vendor";
import { executeUpdateVendor } from "./server/actions/update-vendor";
import { executeSetVendorActive } from "./server/actions/set-vendor-active";
import { executeDeleteVendor } from "./server/actions/delete-vendor";
import type {
  UnitDeleteActionState,
  UnitFormActionState,
  UnitLifecycleActionState,
  VendorDeleteActionState,
  VendorFormActionState,
  VendorLifecycleActionState,
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

export async function createVendorAction(
  formData: FormData,
): Promise<VendorFormActionState> {
  return executeCreateVendor(formData);
}

export async function updateVendorAction(
  formData: FormData,
): Promise<VendorFormActionState> {
  return executeUpdateVendor(formData);
}

export async function setVendorActiveAction(
  id: string,
  active: boolean,
): Promise<VendorLifecycleActionState> {
  return executeSetVendorActive(id, active);
}

export async function deleteVendorAction(
  id: string,
): Promise<VendorDeleteActionState> {
  return executeDeleteVendor(id);
}
