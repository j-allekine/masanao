import { describe, expect, it } from "vitest";

import {
  normalizeCategoryDisplayValue,
  normalizeCategoryKey,
} from "@/features/master-data/domain/category";
import {
  categoryFieldErrors,
  categorySchema,
} from "@/features/master-data/schemas/category";

describe("Master Data Category normalization", () => {
  it("trims display values while preserving meaningful internal whitespace", () => {
    expect(normalizeCategoryDisplayValue("  Rice   & Grains  ")).toBe(
      "Rice   & Grains",
    );
    expect(normalizeCategoryKey("  ÉCLAIR  ")).toBe("éclair");
  });

  it("preserves display casing and maps blank descriptions to null", () => {
    const result = categorySchema.safeParse({
      name: "  Rice   & Grains  ",
      description: "   ",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toEqual({
      name: "Rice   & Grains",
      description: null,
      normalizedName: "rice   & grains",
    });
  });

  it("reports required and maximum-length validation on the correct fields", () => {
    const result = categorySchema.safeParse({
      name: "   ",
      description: "x".repeat(501),
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(categoryFieldErrors(result.error)).toEqual({
      name: ["Category name is required"],
      description: [
        "Category description must be 500 characters or fewer",
      ],
    });
  });
});
