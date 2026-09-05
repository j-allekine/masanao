import { z } from "zod";

import {
  normalizeOfficeDisplayValue,
  normalizeOfficeKey,
  OFFICE_ABBREVIATION_MAX_LENGTH,
  OFFICE_CONTACT_NUMBER_MAX_LENGTH,
  OFFICE_HEAD_DESIGNATION_MAX_LENGTH,
  OFFICE_HEAD_NAME_MAX_LENGTH,
  OFFICE_NAME_MAX_LENGTH,
  OFFICE_OFFICIAL_EMAIL_MAX_LENGTH,
} from "../domain/office";
import type { OfficeFieldErrors } from "../types";

const officeNameSchema = z
  .string()
  .transform(normalizeOfficeDisplayValue)
  .pipe(
    z
      .string()
      .min(1, "Office name is required")
      .max(
        OFFICE_NAME_MAX_LENGTH,
        `Office name must be ${OFFICE_NAME_MAX_LENGTH} characters or fewer`,
      ),
  );

function optionalOfficeText(label: string, max: number) {
  return z.preprocess(
    (value) => {
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        return null;
      }

      return value;
    },
    z.union([
      z.null(),
      z
        .string()
        .transform(normalizeOfficeDisplayValue)
        .pipe(z.string().max(max, `${label} must be ${max} characters or fewer`)),
    ]),
  );
}

const officialEmailSchema = z.preprocess(
  (value) => {
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return null;
    }

    return value;
  },
  z.union([
    z.null(),
    z
      .string()
      .transform(normalizeOfficeDisplayValue)
      .pipe(
        z
          .string()
          .max(
            OFFICE_OFFICIAL_EMAIL_MAX_LENGTH,
            `Official email must be ${OFFICE_OFFICIAL_EMAIL_MAX_LENGTH} characters or fewer`,
          )
          .email("Official email must be a valid email address"),
      ),
  ]),
);

export const officeSchema = z
  .object({
    name: officeNameSchema,
    abbreviation: optionalOfficeText(
      "Office abbreviation",
      OFFICE_ABBREVIATION_MAX_LENGTH,
    ),
    headName: optionalOfficeText("Head name", OFFICE_HEAD_NAME_MAX_LENGTH),
    headDesignation: optionalOfficeText(
      "Head designation",
      OFFICE_HEAD_DESIGNATION_MAX_LENGTH,
    ),
    officialEmail: officialEmailSchema,
    contactNumber: optionalOfficeText(
      "Contact number",
      OFFICE_CONTACT_NUMBER_MAX_LENGTH,
    ),
  })
  .transform((value) => ({
    ...value,
    normalizedName: normalizeOfficeKey(value.name),
    normalizedAbbreviation:
      value.abbreviation === null
        ? null
        : normalizeOfficeKey(value.abbreviation),
  }));

export type OfficeInput = z.infer<typeof officeSchema>;

const officeFields = new Set([
  "name",
  "abbreviation",
  "headName",
  "headDesignation",
  "officialEmail",
  "contactNumber",
]);

export function officeFieldErrors(error: z.ZodError): OfficeFieldErrors {
  const fields: OfficeFieldErrors = {};

  for (const issue of error.issues) {
    const path = issue.path[0];
    const field =
      typeof path === "string" && officeFields.has(path)
        ? (path as keyof OfficeFieldErrors)
        : "form";
    fields[field] ??= [];
    fields[field]?.push(issue.message);
  }

  return fields;
}
