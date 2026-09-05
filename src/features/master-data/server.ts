import "server-only";

import type { CurrentActor } from "@/server/auth";

import { createUnitCommand } from "./server/commands/create-unit";
import { deleteUnitCommand } from "./server/commands/delete-unit";
import { setUnitActiveCommand } from "./server/commands/set-unit-active";
import { updateUnitCommand } from "./server/commands/update-unit";
import { createCategoryCommand } from "./server/commands/create-category";
import { deleteCategoryCommand } from "./server/commands/delete-category";
import { setCategoryActiveCommand } from "./server/commands/set-category-active";
import { updateCategoryCommand } from "./server/commands/update-category";
import { isAdministrator } from "./server/policies/authorization";
import { listCategories as listCategoriesQuery } from "./server/queries/list-categories";
import { listUnits as listUnitsQuery } from "./server/queries/list-units";
import type {
  CategoryCreateResult,
  CategoryDeleteResult,
  CategoryLifecycleResult,
  CategoryUpdateResult,
  UnitCreateResult,
  UnitDeleteResult,
  UnitLifecycleResult,
  UnitUpdateResult,
} from "./types";

export type {
  CategoryListItem,
  UnitCreateResult,
  UnitDeleteResult,
  UnitLifecycleResult,
  UnitListItem,
  UnitUpdateResult,
} from "./types";

export async function listUnits() {
  return listUnitsQuery();
}

export async function listCategories() {
  return listCategoriesQuery();
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
