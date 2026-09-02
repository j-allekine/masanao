import { z } from "zod";

import { parsePesoStringToCentavos } from "../domain/planned-budget";
import type { ActivityFieldErrors } from "../types";

const optionalText = (label: string, max: number) =>
  z.preprocess(
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
      .max(max, `${label} must be ${max} characters or fewer`)
      .optional(),
  );

const optionalNonNegativeInteger = (label: string) =>
  z.preprocess(
    (value) => {
      if (
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        return undefined;
      }

      if (typeof value === "string") {
        return Number(value.replaceAll(",", ""));
      }
      return value;
    },
    z
      .number()
      .int(`${label} must be a whole number`)
      .min(0, `${label} cannot be negative`)
      .max(2_147_483_647, `${label} exceeds the supported maximum`)
      .optional(),
  );

function isValidDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const scheduledDateSchema = z
  .string()
  .trim()
  .min(1, "Scheduled date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Scheduled date must be a valid date")
  .refine(isValidDateOnly, "Scheduled date must be a valid date");

const nameSchema = z
  .string()
  .trim()
  .min(1, "Activity name is required")
  .max(200, "Activity name must be 200 characters or fewer");

const officeNameSchema = z
  .string()
  .trim()
  .min(1, "Office name is required")
  .max(200, "Office name must be 200 characters or fewer");

const plannedBudgetPesosSchema = z.preprocess(
  (value) => {
    if (
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return undefined;
    }

    if (typeof value === "string") {
      return value.trim().replace(/^₱\s*/, "").replaceAll(",", "");
    }

    return value;
  },
  z
    .string()
    .trim()
    .superRefine((value, context) => {
      const result = parsePesoStringToCentavos(value);

      if (!result.ok) {
        context.addIssue({
          code: "custom",
          message:
            result.reason === "too-large"
              ? "Planned budget exceeds the supported maximum"
              : "Planned budget must be a non-negative peso amount with up to two decimal places",
        });
      }
    })
    .transform((value) => parsePesoStringToCentavos(value))
    .transform((result) => (result.ok ? result.centavos : z.NEVER))
    .optional(),
);

export const activitySchema = z.object({
  name: nameSchema,
  officeName: officeNameSchema,
  particulars: optionalText("Activity particulars", 2_000),
  scheduledDate: scheduledDateSchema,
  venue: optionalText("Venue", 300),
  plannedParticipantCount: optionalNonNegativeInteger(
    "Planned participant count",
  ),
  plannedBudgetPesos: plannedBudgetPesosSchema,
});

export type ActivityInput = z.infer<typeof activitySchema>;

export function activityFieldErrors(error: z.ZodError): ActivityFieldErrors {
  const fields: ActivityFieldErrors = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form") as keyof ActivityFieldErrors;
    fields[field] ??= [];
    fields[field]?.push(issue.message);
  }

  return fields;
}
