import { z } from "zod";

import type { FieldErrors } from "../types";

const activityDesignNoSchema = z
    .string()
    .trim()
    .min(1, "Activity Design No. is required")
    .max(100, "Activity Design No. must be 100 characters or fewer")
    .transform((value) => value.toLowerCase());

const fiscalYearSchema = z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() !== "") {
        return Number(value);
      }

      return value;
    },
    z
      .number()
      .int("Fiscal year must be a whole year")
      .min(1900, "Fiscal year must be 1900 or later")
      .max(9999, "Fiscal year must be 9999 or earlier"),
  );

const titleSchema = z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer");

const officeNameSchema = z
    .string()
    .trim()
    .min(1, "Office name is required")
    .max(200, "Office name must be 200 characters or fewer");

const aipReferenceCodeSchema = z.preprocess(
    (value) => {
      if (
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        return undefined;
      }

      return value;
    },
    z
      .string()
      .trim()
      .max(100, "AIP Reference Code must be 100 characters or fewer")
      .optional(),
  );

const aipReferenceCodeUpdateSchema = z.preprocess(
  (value) => {
    if (
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return null;
    }

    return value;
  },
  z
    .string()
    .trim()
    .max(100, "AIP Reference Code must be 100 characters or fewer")
    .nullable()
    .optional(),
);

export const activityDesignSchema = z.object({
  activityDesignNo: activityDesignNoSchema,
  fiscalYear: fiscalYearSchema,
  title: titleSchema,
  officeName: officeNameSchema,
  aipReferenceCode: aipReferenceCodeSchema,
});

export type ActivityDesignInput = z.infer<typeof activityDesignSchema>;

export const activityDesignUpdateSchema = z.object({
  activityDesignNo: activityDesignNoSchema,
  title: titleSchema,
  officeName: officeNameSchema,
  aipReferenceCode: aipReferenceCodeUpdateSchema,
});

export type ActivityDesignUpdateInput = z.infer<
  typeof activityDesignUpdateSchema
>;

export function activityDesignFieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form") as keyof FieldErrors;
    fields[field] ??= [];
    fields[field]?.push(issue.message);
  }

  return fields;
}
