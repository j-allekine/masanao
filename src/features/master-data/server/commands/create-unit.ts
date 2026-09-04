import "server-only";

import { unitFieldErrors, unitSchema } from "../../schemas/unit";
import type { UnitCreateResult } from "../../types";
import {
  createUnitRecord,
  findUnitConflictRecord,
  getUnitDuplicateField,
  isUniqueConstraintViolation,
} from "../db/units";

function duplicateResult(
  field: "name" | "abbreviation" | "form",
): UnitCreateResult {
  const label = field === "name" ? "name" : "abbreviation";
  const message =
    field === "form"
      ? "A Unit with that name or abbreviation already exists."
      : `A Unit with that ${label} already exists.`;

  return {
    ok: false,
    kind: "duplicate",
    error: message,
    fields: field === "form" ? { form: [message] } : { [field]: [message] },
  };
}

export async function createUnitCommand(
  input: unknown,
): Promise<UnitCreateResult> {
  const parsedInput = unitSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Unit fields.",
      fields: unitFieldErrors(parsedInput.error),
    };
  }

  const conflict = await findUnitConflictRecord(parsedInput.data);
  if (conflict) return duplicateResult(conflict);

  try {
    return {
      ok: true,
      unit: await createUnitRecord(parsedInput.data),
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return duplicateResult(getUnitDuplicateField(error) ?? "form");
    }

    throw error;
  }
}
