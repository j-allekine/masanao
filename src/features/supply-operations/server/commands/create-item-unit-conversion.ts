import "server-only";

import { itemUnitConversionFieldErrors, itemUnitConversionSchema } from "../../schemas/item-unit-conversion";
import type { ItemUnitConversionCreateResult } from "../../types";
import { createItemUnitConversionRecord } from "../db/items";

export async function createItemUnitConversionCommand(itemId: string, input: unknown): Promise<ItemUnitConversionCreateResult> {
  const parsed = itemUnitConversionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, kind: "validation", error: "Please correct the highlighted conversion fields.", fields: itemUnitConversionFieldErrors(parsed.error) };
  }
  const result = await createItemUnitConversionRecord({ itemId, ...parsed.data });
  if (result.kind === "created") return { ok: true, conversion: result.conversion };
  if (result.kind === "not-found") return { ok: false, kind: "not-found", error: "The Item could not be found.", fields: {} };
  if (result.kind === "inactive-item") return { ok: false, kind: "inactive", error: "Alternate Units cannot be added to an Inactive Item.", fields: {} };
  if (result.kind === "base-unit") return { ok: false, kind: "validation", error: "Choose a Unit other than the Item's Base Unit.", fields: { alternateUnitId: ["The Base Unit cannot be an alternate Unit."] } };
  if (result.kind === "invalid-unit") return { ok: false, kind: "validation", error: "Select an active alternate Unit.", fields: { alternateUnitId: ["Select an active alternate Unit."] } };
  return { ok: false, kind: "duplicate", error: "That alternate Unit and Base Unit quantity are already configured.", fields: { form: ["That conversion already exists."] } };
}
