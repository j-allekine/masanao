import { z } from "zod";
const identifier = z.string().min(1).max(100);
const decimal = z.string().max(200).refine(v => v === "" || /^\d+(?:\.\d+)?$/.test(v), "Enter an exact nonnegative decimal or leave blank.");
export const correctionBeginSchema = z.object({ id: identifier }).strict();
export const correctionRevisionSchema = z.object({ id: identifier, revision: z.number().int().nonnegative() }).strict();
export const correctionPostSchema = correctionRevisionSchema.extend({ zeroCostAcknowledged: z.boolean() }).strict();
export const correctionSaveSchema = correctionRevisionSchema.extend({ reason: z.string().max(2000), note: z.string().max(2000), lines: z.array(z.object({ id: identifier, itemId: identifier, selectedUnitId: identifier, conversionId: identifier.nullable(), quantity: decimal.refine(v => v === "" || /[1-9]/.test(v), "Enter a positive quantity."), openingUnitCost: decimal, zeroCostReason: z.string().max(1000) }).strict()).max(1000) }).strict().superRefine((value, ctx) => { const ids = new Set<string>(); value.lines.forEach((line, index) => { if (ids.has(line.id)) ctx.addIssue({ code: "custom", path: ["lines",index,"id"], message: "Duplicate correction line." }); ids.add(line.id); }); });
