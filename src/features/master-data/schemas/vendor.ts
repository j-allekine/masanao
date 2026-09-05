import { z } from "zod";

import {
  normalizeVendorDisplayValue,
  VENDOR_ADDRESS_MAX_LENGTH,
  VENDOR_CONTACT_NUMBER_MAX_LENGTH,
  VENDOR_CONTACT_PERSON_MAX_LENGTH,
  VENDOR_EMAIL_MAX_LENGTH,
  VENDOR_NAME_MAX_LENGTH,
} from "../domain/vendor";
import type { VendorFieldErrors } from "../types";

const vendorNameSchema = z.preprocess(
  (value) =>
    typeof value === "string" ? normalizeVendorDisplayValue(value) : value,
  z
    .string()
    .min(1, "Vendor name is required")
    .max(
      VENDOR_NAME_MAX_LENGTH,
      `Vendor name must be ${VENDOR_NAME_MAX_LENGTH} characters or fewer`,
    ),
);

function optionalVendorField(maxLength: number, label: string) {
  return z
    .preprocess(
      (value) =>
        value == null
          ? ""
          : typeof value === "string"
            ? normalizeVendorDisplayValue(value)
            : value,
      z.string().max(maxLength, `${label} must be ${maxLength} characters or fewer`),
    )
    .transform((value) => (value === "" ? null : value));
}

const vendorEmailSchema = z
  .preprocess(
    (value) =>
      value == null
        ? ""
        : typeof value === "string"
          ? normalizeVendorDisplayValue(value)
          : value,
    z
      .string()
      .max(
        VENDOR_EMAIL_MAX_LENGTH,
        `Email must be ${VENDOR_EMAIL_MAX_LENGTH} characters or fewer`,
      )
      .refine(
        (value) =>
          value === "" || z.email().safeParse(value).success,
        "Email must be a valid email address",
      ),
  )
  .transform((value) => (value === "" ? null : value));

const vendorIdentitySchema = z.object({
  name: vendorNameSchema,
  contactPerson: optionalVendorField(
    VENDOR_CONTACT_PERSON_MAX_LENGTH,
    "Contact person",
  ),
  contactNumber: optionalVendorField(
    VENDOR_CONTACT_NUMBER_MAX_LENGTH,
    "Contact number",
  ),
  email: vendorEmailSchema,
  address: optionalVendorField(VENDOR_ADDRESS_MAX_LENGTH, "Address"),
});

export const vendorSchema = vendorIdentitySchema;

export type VendorInput = z.infer<typeof vendorSchema>;

export function vendorFieldErrors(error: z.ZodError): VendorFieldErrors {
  const fields: VendorFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    const key =
      field === "name" ||
      field === "contactPerson" ||
      field === "contactNumber" ||
      field === "email" ||
      field === "address"
        ? field
        : "form";
    fields[key] ??= [];
    fields[key]?.push(issue.message);
  }

  return fields;
}
