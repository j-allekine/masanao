import "server-only";

import { itemFieldErrors, itemSchema } from "../../schemas/item";
import type { ItemFieldErrors, ItemUpdateResult } from "../../types";
import {
  isRecordNotFound,
  isUniqueConstraintViolation,
  updateItemWithActiveLookups,
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

  try {
    const result = await updateItemWithActiveLookups(id, parsedInput.data);

    if (result.kind === "not-found") return notFoundResult();
    if (result.kind === "duplicate") return duplicateResult();
    if (result.kind === "invalid-lookups") {
      const fields: ItemFieldErrors = {};
      if (!result.category) fields.categoryId = ["Select an active Category."];
      if (!result.baseUnit) fields.baseUnitId = ["Select an active Base Unit."];

      return validationResult(
        fields,
        "Please choose an active Category and Base Unit, or keep the assigned lookup value.",
      );
    }

    return {
      ok: true,
      item: result.item,
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) return duplicateResult();
    if (isRecordNotFound(error)) return notFoundResult();

    throw error;
  }
}
