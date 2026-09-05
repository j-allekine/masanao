import "server-only";

import type { CurrentActor } from "@/server/auth";

import { createOfficeCommand } from "./server/commands/create-office";
import { createUnitCommand } from "./server/commands/create-unit";
import { deleteUnitCommand } from "./server/commands/delete-unit";
import { setUnitActiveCommand } from "./server/commands/set-unit-active";
import { updateOfficeCommand } from "./server/commands/update-office";
import { updateUnitCommand } from "./server/commands/update-unit";
import { createCategoryCommand } from "./server/commands/create-category";
import { deleteCategoryCommand } from "./server/commands/delete-category";
import { setCategoryActiveCommand } from "./server/commands/set-category-active";
import { updateCategoryCommand } from "./server/commands/update-category";
import { createVendorCommand } from "./server/commands/create-vendor";
import { deleteVendorCommand } from "./server/commands/delete-vendor";
import { setVendorActiveCommand } from "./server/commands/set-vendor-active";
import { updateVendorCommand } from "./server/commands/update-vendor";
import { isAdministrator } from "./server/policies/authorization";
import { listCategories as listCategoriesQuery } from "./server/queries/list-categories";
import { listOffices as listOfficesQuery } from "./server/queries/list-offices";
import { listUnits as listUnitsQuery } from "./server/queries/list-units";
import { listVendors as listVendorsQuery } from "./server/queries/list-vendors";
import type {
  CategoryCreateResult,
  CategoryDeleteResult,
  CategoryLifecycleResult,
  CategoryUpdateResult,
  OfficeListItem,
  OfficeCreateResult,
  OfficeUpdateResult,
  UnitCreateResult,
  UnitDeleteResult,
  UnitLifecycleResult,
  UnitUpdateResult,
  VendorCreateResult,
  VendorDeleteResult,
  VendorLifecycleResult,
  VendorUpdateResult,
} from "./types";

export type {
  CategoryListItem,
  OfficeCreateResult,
  OfficeListItem,
  OfficeUpdateResult,
  UnitCreateResult,
  UnitDeleteResult,
  UnitLifecycleResult,
  UnitListItem,
  VendorListItem,
  VendorDeleteResult,
  VendorLifecycleResult,
  UnitUpdateResult,
} from "./types";

export async function listUnits() {
  return listUnitsQuery();
}

export async function listCategories() {
  return listCategoriesQuery();
}

export async function listOffices() {
  return listOfficesQuery();
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

export async function canManageCategories(actor: CurrentActor) {
  return isAdministrator(actor);
}

export async function canManageVendors(actor: CurrentActor) {
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

export async function createCategory(
  actor: CurrentActor,
  input: unknown,
): Promise<CategoryCreateResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) {
    return { ...authorizationFailure, fields: {} };
  }

  return createCategoryCommand(input);
}

export async function updateCategory(
  actor: CurrentActor,
  id: string,
  input: unknown,
): Promise<CategoryUpdateResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) {
    return { ...authorizationFailure, fields: {} };
  }

  return updateCategoryCommand(id, input);
}

export async function setCategoryActive(
  actor: CurrentActor,
  id: string,
  isActive: boolean,
): Promise<CategoryLifecycleResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  return setCategoryActiveCommand(id, isActive);
}

export async function deleteCategory(
  actor: CurrentActor,
  id: string,
): Promise<CategoryDeleteResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  return deleteCategoryCommand(id);
}

export async function createVendor(
  actor: CurrentActor,
  input: unknown,
): Promise<VendorCreateResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) {
    return { ...authorizationFailure, fields: {} };
  }

  return createVendorCommand(input);
}

export async function updateVendor(
  actor: CurrentActor,
  id: string,
  input: unknown,
): Promise<VendorUpdateResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) {
    return { ...authorizationFailure, fields: {} };
  }

  return updateVendorCommand(id, input);
}

export async function setVendorActive(
  actor: CurrentActor,
  id: string,
  active: boolean,
): Promise<VendorLifecycleResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  return setVendorActiveCommand(id, active);
}

export async function deleteVendor(
  actor: CurrentActor,
  id: string,
): Promise<VendorDeleteResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  if (authorizationFailure) return authorizationFailure;

  return deleteVendorCommand(id);
}
