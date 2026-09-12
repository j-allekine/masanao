import "server-only";

import { itemFieldErrors, itemSchema } from "../../schemas/item";
import type { ItemFieldErrors, ItemUpdateResult } from "../../types";
import {
  findActiveItemLookups,
  findItemConflictRecord,
  findItemRecord,
  isRecordNotFound,
  isUniqueConstraintViolation,
  updateItemRecord,
} from "../db/items";

function validationResult(
  fields: ItemFieldErrors,
  error = "Please correct the highlighted Item fields.",
): ItemUpdateResult {
  return { ok: false, kind: "validation", error, fields };
}

function duplicateResult(): ItemUpdateResult {
  const message = "An Item with that name already exists.";

  return {
    ok: false,
    kind: "duplicate",
    error: message,
    fields: { name: [message] },
  };
}

function notFoundResult(): ItemUpdateResult {
  return {
    ok: false,
    kind: "not-found",
    error: "The Item could not be found.",
    fields: {},
  };
}

export async function updateItemCommand(
  id: string,
  input: unknown,
): Promise<ItemUpdateResult> {
  const parsedInput = itemSchema.safeParse(input);

  if (!parsedInput.success) {
    return validationResult(itemFieldErrors(parsedInput.error));
  }

  const existing = await findItemRecord(id);
  if (!existing) return notFoundResult();

  const conflict = await findItemConflictRecord(parsedInput.data, id);
  if (conflict) return duplicateResult();

  const { category, baseUnit } = await findActiveItemLookups(
    parsedInput.data,
    existing,
  );
  const fields: ItemFieldErrors = {};

  if (!category) {
    fields.categoryId = ["Select an active Category."];
  }
  if (!baseUnit) {
    fields.baseUnitId = ["Select an active Base Unit."];
  }
  if (Object.keys(fields).length > 0) {
    return validationResult(
      fields,
      "Please choose an active Category and Base Unit, or keep the assigned lookup value.",
    );
  }

  try {
    return {
      ok: true,
      item: await updateItemRecord(id, parsedInput.data),
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) return duplicateResult();
    if (isRecordNotFound(error)) return notFoundResult();

    throw error;
  }
}
