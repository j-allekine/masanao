import "server-only";

import { unitFieldErrors, unitSchema } from "../../schemas/unit";
import type { UnitCreateResult } from "../../types";
import {
  createUnitRecord,
  findUnitConflictRecord,
  isUniqueConstraintViolation,
} from "../db/units";

function duplicateResult(field: "name" | "abbreviation"): UnitCreateResult {
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
      return duplicateResult("name");
    }

    throw error;
  }
}
