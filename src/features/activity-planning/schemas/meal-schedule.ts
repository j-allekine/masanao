import { z } from "zod";

import type { MealScheduleFieldErrors } from "../types";

const optionalNonNegativeInteger = (label: string) =>
  z.preprocess(
    (value) => {
      if (
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        return undefined;
      }

      if (typeof value === "string") return Number(value);
      return value;
    },
    z
      .number()
      .int(`${label} must be a whole number`)
      .min(0, `${label} cannot be negative`)
      .max(2_147_483_647, `${label} exceeds the supported maximum`)
      .optional(),
  );

export const mealScheduleSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Meal Schedule label is required")
    .max(100, "Meal Schedule label must be 100 characters or fewer"),
  mealTime: z
    .string()
    .trim()
    .regex(
      /^(?:[01]\d|2[0-3]):[0-5]\d$/,
      "Meal time must use HH:mm format",
    ),
  plannedServings: optionalNonNegativeInteger("Planned servings"),
});

export type MealScheduleInput = z.infer<typeof mealScheduleSchema>;

export function mealScheduleFieldErrors(
  error: z.ZodError,
): MealScheduleFieldErrors {
  const fields: MealScheduleFieldErrors = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form") as keyof MealScheduleFieldErrors;
    fields[field] ??= [];
    fields[field]?.push(issue.message);
  }

  return fields;
}
