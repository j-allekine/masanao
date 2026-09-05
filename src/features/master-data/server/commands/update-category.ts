import "server-only";

import { categoryFieldErrors, categorySchema } from "../../schemas/category";
import type { CategoryUpdateResult } from "../../types";
import {
  findCategoryConflictRecord,
  isRecordNotFound,
  isUniqueConstraintViolation,
  updateCategoryRecord,
} from "../db/categories";

function duplicateResult(): CategoryUpdateResult {
  const message = "A Category with that name already exists.";

  return {
    ok: false,
    kind: "duplicate",
    error: message,
    fields: { name: [message] },
  };
}

export async function updateCategoryCommand(
  id: string,
  input: unknown,
): Promise<CategoryUpdateResult> {
  const parsedInput = categorySchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Category fields.",
      fields: categoryFieldErrors(parsedInput.error),
    };
  }

  const conflict = await findCategoryConflictRecord(parsedInput.data, id);
  if (conflict) return duplicateResult();

  try {
    return {
      ok: true,
      category: await updateCategoryRecord(id, parsedInput.data),
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return duplicateResult();
    }

    if (isRecordNotFound(error)) {
      return {
        ok: false,
        kind: "not-found",
        error: "The Category could not be found.",
        fields: {},
      };
    }

    throw error;
  }
}
