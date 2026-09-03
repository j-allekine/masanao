import "server-only";

import { unitFieldErrors, unitSchema } from "../../schemas/unit";
import type { UnitUpdateResult } from "../../types";
import {
  findUnitConflictRecord,
  isRecordNotFound,
  isUniqueConstraintViolation,
  updateUnitRecord,
} from "../db/units";

function duplicateResult(field: "name" | "abbreviation"): UnitUpdateResult {
  const label = field === "name" ? "name" : "abbreviation";

  return {
    ok: false,
    kind: "duplicate",
    error: `A Unit with that ${label} already exists.`,
    fields: {
      [field]: [`A Unit with that ${label} already exists.`],
    },
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
      return duplicateResult("name");
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
