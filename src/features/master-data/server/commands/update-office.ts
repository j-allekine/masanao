import "server-only";

import { officeFieldErrors, officeSchema } from "../../schemas/office";
import type { OfficeUpdateResult } from "../../types";
import {
  findOfficeConflictRecord,
  getOfficeDuplicateField,
  isRecordNotFound,
  isUniqueConstraintViolation,
  updateOfficeRecord,
} from "../db/offices";

function duplicateResult(
  field: "name" | "abbreviation" | "form",
): OfficeUpdateResult {
  const label = field === "name" ? "name" : "abbreviation";
  const message =
    field === "form"
      ? "An Office with that name or abbreviation already exists."
      : `An Office with that ${label} already exists.`;

  return {
    ok: false,
    kind: "duplicate",
    error: message,
    fields: field === "form" ? { form: [message] } : { [field]: [message] },
  };
}

export async function updateOfficeCommand(
  id: string,
  input: unknown,
): Promise<OfficeUpdateResult> {
  const parsedInput = officeSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Office fields.",
      fields: officeFieldErrors(parsedInput.error),
    };
  }

  const conflict = await findOfficeConflictRecord(parsedInput.data, id);
  if (conflict) return duplicateResult(conflict);

  try {
    return {
      ok: true,
      office: await updateOfficeRecord(id, parsedInput.data),
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return duplicateResult(getOfficeDuplicateField(error) ?? "form");
    }

    if (isRecordNotFound(error)) {
      return {
        ok: false,
        kind: "not-found",
        error: "The Office could not be found.",
        fields: {},
      };
    }

    throw error;
  }
}
