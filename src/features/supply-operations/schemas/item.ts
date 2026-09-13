import { z } from "zod";

import {
  ITEM_NAME_MAX_LENGTH,
  ITEM_NOTE_MAX_LENGTH,
  normalizeItemDisplayValue,
  normalizeItemKey,
  normalizeItemNote,
} from "../domain/item";
import type { ItemFieldErrors } from "../types";

const itemNameSchema = z
  .string({ error: "Item name is required" })
  .transform(normalizeItemDisplayValue)
  .pipe(
    z
      .string()
      .min(1, "Item name is required")
      .max(
        ITEM_NAME_MAX_LENGTH,
        `Item name must be ${ITEM_NAME_MAX_LENGTH} characters or fewer`,
      ),
  );

const itemLookupIdSchema = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`);

const itemNoteSchema = z
  .string()
  .optional()
  .transform((value) => normalizeItemNote(value ?? ""))
  .pipe(
    z.string().max(
      ITEM_NOTE_MAX_LENGTH,
      `Item Note must be ${ITEM_NOTE_MAX_LENGTH} characters or fewer`,
    ),
  )
  .transform((value) => (value === "" ? null : value));

const itemIdentitySchema = z.object({
  name: itemNameSchema,
  categoryId: itemLookupIdSchema("Category"),
  baseUnitId: itemLookupIdSchema("Base Unit"),
  note: itemNoteSchema,
});

export const itemSchema = itemIdentitySchema.transform((value) => ({
  ...value,
  normalizedName: normalizeItemKey(value.name),
}));

export type ItemInput = z.infer<typeof itemSchema>;

export function itemFieldErrors(error: z.ZodError): ItemFieldErrors {
  const fields: ItemFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    const key =
      field === "name" ||
      field === "categoryId" ||
      field === "baseUnitId" ||
      field === "note"
        ? field
        : "form";
    fields[key] ??= [];
    fields[key]?.push(issue.message);
  }

  return fields;
}
