import "server-only";

import { officeFieldErrors, officeSchema } from "../../schemas/office";
import type { OfficeCreateResult } from "../../types";
import {
  createOfficeRecord,
  findOfficeConflictRecord,
  getOfficeDuplicateField,
  isUniqueConstraintViolation,
} from "../db/offices";

function duplicateResult(
  field: "name" | "abbreviation" | "form",
): OfficeCreateResult {
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

export async function createOfficeCommand(
  input: unknown,
): Promise<OfficeCreateResult> {
  const parsedInput = officeSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Office fields.",
      fields: officeFieldErrors(parsedInput.error),
    };
  }

  const conflict = await findOfficeConflictRecord(parsedInput.data);
  if (conflict) return duplicateResult(conflict);

  try {
    return {
      ok: true,
      office: await createOfficeRecord(parsedInput.data),
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return duplicateResult(getOfficeDuplicateField(error) ?? "form");
    }

    throw error;
  }
}
