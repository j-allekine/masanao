import "server-only";

import { itemFieldErrors, itemSchema } from "../../schemas/item";
import type { ItemCreateResult, ItemFieldErrors } from "../../types";
import {
  createItemRecord,
  findActiveItemLookups,
  findItemConflictRecord,
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

  const conflict = await findItemConflictRecord(parsedInput.data);
  if (conflict) return duplicateResult();

  const { category, baseUnit } = await findActiveItemLookups(parsedInput.data);
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
      "Please choose an active Category and Base Unit.",
    );
  }

  try {
    return {
      ok: true,
      item: await createItemRecord(parsedInput.data),
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) return duplicateResult();

    throw error;
  }
}
