import "server-only";

import { itemFieldErrors, itemSchema } from "../../schemas/item";
import type { ItemCreateResult, ItemFieldErrors } from "../../types";
import {
  createItemWithActiveLookups,
  isUniqueConstraintViolation,
} from "../db/items";

function validationResult(
  fields: ItemFieldErrors,
  error = "Please correct the highlighted Item fields.",
): ItemCreateResult {
  return { ok: false, kind: "validation", error, fields };
}

function duplicateResult(): ItemCreateResult {
  const message = "An Item with that name already exists.";

  return {
    ok: false,
    kind: "duplicate",
    error: message,
    fields: { name: [message] },
  };
}

export async function createItemCommand(
  input: unknown,
): Promise<ItemCreateResult> {
  const parsedInput = itemSchema.safeParse(input);

  if (!parsedInput.success) {
    return validationResult(itemFieldErrors(parsedInput.error));
  }

  try {
    const result = await createItemWithActiveLookups(parsedInput.data);

    if (result.kind === "duplicate") return duplicateResult();
    if (result.kind === "invalid-lookups") {
      const fields: ItemFieldErrors = {};
      if (!result.category) fields.categoryId = ["Select an active Category."];
      if (!result.baseUnit) fields.baseUnitId = ["Select an active Base Unit."];

      return validationResult(
        fields,
        "Please choose an active Category and Base Unit.",
      );
    }

    return {
      ok: true,
      item: result.item,
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) return duplicateResult();

    throw error;
  }
}
