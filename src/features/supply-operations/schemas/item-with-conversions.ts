import { z } from "zod";
import { itemSchema } from "./item";
import { itemUnitConversionSchema } from "./item-unit-conversion";

export const itemWithConversionsSchema = z.object({
  item: itemSchema,
  conversions: z.array(itemUnitConversionSchema).default([]),
});

export type ItemWithConversionsInput = z.infer<typeof itemWithConversionsSchema>;

export function itemWithConversionsErrors(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path[0] === "item" ? issue.path.slice(1) : issue.path;
    const key = path.join(".") || "form";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}
