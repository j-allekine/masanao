import { z } from "zod";

import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  normalizeCategoryDisplayValue,
  normalizeCategoryKey,
} from "../domain/category";
import type { CategoryFieldErrors } from "../types";

const categoryNameSchema = z
  .string()
  .transform(normalizeCategoryDisplayValue)
  .pipe(
    z
      .string()
      .min(1, "Category name is required")
      .max(
        CATEGORY_NAME_MAX_LENGTH,
        `Category name must be ${CATEGORY_NAME_MAX_LENGTH} characters or fewer`,
      ),
  );

const categoryDescriptionSchema = z
  .string()
  .optional()
  .transform((value) => normalizeCategoryDisplayValue(value ?? ""))
  .pipe(
    z.string().max(
      CATEGORY_DESCRIPTION_MAX_LENGTH,
      `Category description must be ${CATEGORY_DESCRIPTION_MAX_LENGTH} characters or fewer`,
    ),
  )
  .transform((value) => (value === "" ? null : value));

const categoryIdentitySchema = z.object({
  name: categoryNameSchema,
  description: categoryDescriptionSchema,
});

export const categorySchema = categoryIdentitySchema.transform((value) => ({
  ...value,
  normalizedName: normalizeCategoryKey(value.name),
}));

export type CategoryInput = z.infer<typeof categorySchema>;

export function categoryFieldErrors(error: z.ZodError): CategoryFieldErrors {
  const fields: CategoryFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    const key = field === "name" || field === "description" ? field : "form";
    fields[key] ??= [];
    fields[key]?.push(issue.message);
  }

  return fields;
}
