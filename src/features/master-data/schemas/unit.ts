import { z } from "zod";

import {
  normalizeUnitDisplayValue,
  normalizeUnitKey,
  UNIT_ABBREVIATION_MAX_LENGTH,
  UNIT_NAME_MAX_LENGTH,
} from "../domain/unit";
import type { UnitFieldErrors } from "../types";

const unitNameSchema = z
  .string()
  .transform(normalizeUnitDisplayValue)
  .pipe(
    z
      .string()
      .min(1, "Unit name is required")
      .max(
        UNIT_NAME_MAX_LENGTH,
        `Unit name must be ${UNIT_NAME_MAX_LENGTH} characters or fewer`,
      ),
  );

const unitAbbreviationSchema = z
  .string()
  .transform(normalizeUnitDisplayValue)
  .pipe(
    z
      .string()
      .min(1, "Unit abbreviation is required")
      .max(
        UNIT_ABBREVIATION_MAX_LENGTH,
        `Unit abbreviation must be ${UNIT_ABBREVIATION_MAX_LENGTH} characters or fewer`,
      ),
  );

const unitIdentitySchema = z.object({
  name: unitNameSchema,
  abbreviation: unitAbbreviationSchema,
});

export const unitSchema = unitIdentitySchema.transform((value) => ({
  ...value,
  normalizedName: normalizeUnitKey(value.name),
  normalizedAbbreviation: normalizeUnitKey(value.abbreviation),
}));

export type UnitInput = z.infer<typeof unitSchema>;

export function unitFieldErrors(error: z.ZodError): UnitFieldErrors {
  const fields: UnitFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    const key = field === "name" || field === "abbreviation" ? field : "form";
    fields[key] ??= [];
    fields[key]?.push(issue.message);
  }

  return fields;
}
