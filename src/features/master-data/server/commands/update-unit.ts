import "server-only";

import { unitFieldErrors, unitSchema } from "../../schemas/unit";
import type { UnitUpdateResult } from "../../types";
import {
  findUnitConflictRecord,
  getUnitDuplicateField,
  isRecordNotFound,
  isUniqueConstraintViolation,
  updateUnitRecord,
} from "../db/units";

function duplicateResult(
  field: "name" | "abbreviation" | "form",
): UnitUpdateResult {
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

export async function updateUnitCommand(
  id: string,
  input: unknown,
): Promise<UnitUpdateResult> {
  const parsedInput = unitSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Unit fields.",
      fields: unitFieldErrors(parsedInput.error),
    };
  }

  const conflict = await findUnitConflictRecord(parsedInput.data, id);
  if (conflict) return duplicateResult(conflict);

  try {
    return {
      ok: true,
      unit: await updateUnitRecord(id, parsedInput.data),
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return duplicateResult(getUnitDuplicateField(error) ?? "form");
    }

    if (isRecordNotFound(error)) {
      return {
        ok: false,
        kind: "not-found",
        error: "The Unit could not be found.",
        fields: {},
      };
    }

    throw error;
  }
}
