import { describe, expect, it } from "vitest";

import {
  normalizeItemDisplayValue,
  normalizeItemKey,
} from "@/features/master-data/domain/item";
import {
  itemFieldErrors,
  itemSchema,
} from "@/features/master-data/schemas/item";

describe("Master Data Item normalization", () => {
  it("collapses whitespace while preserving display casing", () => {
    expect(normalizeItemDisplayValue("  Rice   &   Grains  ")).toBe(
      "Rice & Grains",
    );
    expect(normalizeItemKey("  Rice   &   Grains  ")).toBe("rice & grains");
  });

  it("preserves multiline Item Notes and maps blank notes to null", () => {
    const result = itemSchema.safeParse({
      name: "  Rice   &   Grains  ",
      categoryId: " category-1 ",
      baseUnitId: " unit-1 ",
      note: "  Store\nseparately  ",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toEqual({
      name: "Rice & Grains",
      categoryId: "category-1",
      baseUnitId: "unit-1",
      note: "Store\nseparately",
      normalizedName: "rice & grains",
    });

    const blankNote = itemSchema.safeParse({
      name: "Rice",
      categoryId: "category-1",
      baseUnitId: "unit-1",
      note: "   ",
    });

    expect(blankNote.success).toBe(true);
    if (!blankNote.success) return;
    expect(blankNote.data.note).toBeNull();
  });

  it("reports required fields and the Item Note length limit", () => {
    const result = itemSchema.safeParse({
      name: "   ",
      categoryId: "   ",
      baseUnitId: "",
      note: "x".repeat(501),
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(itemFieldErrors(result.error)).toEqual({
      name: ["Item name is required"],
      categoryId: ["Category is required"],
      baseUnitId: ["Base Unit is required"],
      note: ["Item Note must be 500 characters or fewer"],
    });
  });
});
