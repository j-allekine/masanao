import { z } from "zod";
import { validOpeningStockDate } from "../domain/opening-stock";

const identifier = z.string().min(1).max(100);
const optionalDecimal = z.string().max(200).refine((value) => value === "" || /^\d+(?:\.\d+)?$/.test(value), "Enter an exact nonnegative decimal, or leave it blank.");
export const openingStockAttemptSchema = z.object({ attemptId: identifier, revision: z.number().int().nonnegative() });
export const openingStockPostSchema = openingStockAttemptSchema.extend({ zeroCostAcknowledged: z.boolean() });
export const openingStockSaveSchema = openingStockAttemptSchema.extend({
  countDate: z.string().refine((value) => value === "" || validOpeningStockDate(value), "Choose a real date no later than today in Manila."),
  note: z.string().max(2000),
  lines: z.array(z.object({
    id: identifier,
    itemId: identifier,
    quantity: optionalDecimal.refine((value) => value === "" || /[1-9]/.test(value), "Enter a positive quantity, or leave it blank."),
    selectedUnitId: identifier,
    conversionId: identifier.nullable(),
    openingUnitCost: optionalDecimal,
    zeroCostReason: z.string().max(1000),
  })).max(1000),
}).superRefine((value, context) => {
  const ids = new Set<string>();
  value.lines.forEach((line, index) => {
    if (ids.has(line.id)) context.addIssue({ code: "custom", path: ["lines", index, "id"], message: "Duplicate count line." });
    ids.add(line.id);
  });
});
