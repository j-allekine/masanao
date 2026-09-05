"use server";

import { executeCreateUnit } from "./server/actions/create-unit";
import { executeDeleteUnit } from "./server/actions/delete-unit";
import { executeSetUnitActive } from "./server/actions/set-unit-active";
import { executeUpdateUnit } from "./server/actions/update-unit";
import { executeCreateCategory } from "./server/actions/create-category";
import { executeDeleteCategory } from "./server/actions/delete-category";
import { executeSetCategoryActive } from "./server/actions/set-category-active";
import { executeUpdateCategory } from "./server/actions/update-category";
import type {
  CategoryDeleteActionState,
  CategoryFormActionState,
  CategoryLifecycleActionState,
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
