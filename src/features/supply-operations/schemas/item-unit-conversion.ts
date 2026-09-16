import { z } from "zod";

import type { ItemUnitConversionFieldErrors } from "../types";

function normalizeExactQuantity(value: string) {
  const [whole, fraction] = value.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = fraction?.replace(/0+$/, "");
  return normalizedFraction ? `${normalizedWhole}.${normalizedFraction}` : normalizedWhole;
}

export const itemUnitConversionSchema = z.object({
  alternateUnitId: z.string().trim().min(1, "Select an alternate Unit."),
  baseUnitQuantity: z.string().trim()
    .min(1, "Base Unit quantity is required.")
    .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, "Enter a positive decimal quantity.")
    .transform(normalizeExactQuantity)
    .refine((value) => value !== "0", "Base Unit quantity must be greater than zero."),
});

export type ItemUnitConversionInput = z.infer<typeof itemUnitConversionSchema>;

export function itemUnitConversionFieldErrors(error: z.ZodError): ItemUnitConversionFieldErrors {
  const fields: ItemUnitConversionFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] === "alternateUnitId" || issue.path[0] === "baseUnitQuantity"
      ? issue.path[0] : "form";
    fields[field] ??= [];
    fields[field]?.push(issue.message);
  }
  return fields;
}
