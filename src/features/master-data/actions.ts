"use server";

import { executeCreateOffice } from "./server/actions/create-office";
import { executeCreateUnit } from "./server/actions/create-unit";
import { executeDeleteUnit } from "./server/actions/delete-unit";
import { executeSetUnitActive } from "./server/actions/set-unit-active";
import { executeUpdateOffice } from "./server/actions/update-office";
import { executeUpdateUnit } from "./server/actions/update-unit";
import { executeCreateCategory } from "./server/actions/create-category";
import { executeDeleteCategory } from "./server/actions/delete-category";
import { executeSetCategoryActive } from "./server/actions/set-category-active";
import { executeUpdateCategory } from "./server/actions/update-category";
import { executeCreateVendor } from "./server/actions/create-vendor";
import { executeDeleteVendor } from "./server/actions/delete-vendor";
import { executeSetVendorActive } from "./server/actions/set-vendor-active";
import { executeUpdateVendor } from "./server/actions/update-vendor";
import type {
  CategoryDeleteActionState,
  CategoryFormActionState,
  CategoryLifecycleActionState,
  OfficeFormActionState,
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

export async function createCategoryAction(
  formData: FormData,
): Promise<CategoryFormActionState> {
  return executeCreateCategory(formData);
}

export async function updateCategoryAction(
  formData: FormData,
): Promise<CategoryFormActionState> {
  return executeUpdateCategory(formData);
}

export async function setCategoryActiveAction(
  id: string,
  isActive: boolean,
): Promise<CategoryLifecycleActionState> {
  return executeSetCategoryActive(id, isActive);
}

export async function deleteCategoryAction(
  id: string,
): Promise<CategoryDeleteActionState> {
  return executeDeleteCategory(id);
}
