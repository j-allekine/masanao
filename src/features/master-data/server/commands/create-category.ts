import "server-only";

import { categoryFieldErrors, categorySchema } from "../../schemas/category";
import type { CategoryCreateResult } from "../../types";
import {
  createCategoryRecord,
  findCategoryConflictRecord,
  isUniqueConstraintViolation,
} from "../db/categories";

function duplicateResult(): CategoryCreateResult {
  const message = "A Category with that name already exists.";

  return {
    ok: false,
    kind: "duplicate",
    error: message,
    fields: { name: [message] },
  };
}

export async function createCategoryCommand(
  input: unknown,
): Promise<CategoryCreateResult> {
  const parsedInput = categorySchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Category fields.",
      fields: categoryFieldErrors(parsedInput.error),
    };
  }

  const conflict = await findCategoryConflictRecord(parsedInput.data);
  if (conflict) return duplicateResult();

  try {
    return {
      ok: true,
      category: await createCategoryRecord(parsedInput.data),
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return duplicateResult();
    }

    throw error;
  }
}
