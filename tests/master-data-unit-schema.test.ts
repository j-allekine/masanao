import { describe, expect, it } from "vitest";

import {
  normalizeUnitDisplayValue,
  normalizeUnitKey,
} from "@/features/master-data/domain/unit";
import {
  unitFieldErrors,
  unitSchema,
} from "@/features/master-data/schemas/unit";

describe("Master Data Unit normalization", () => {
  it("preserves display casing while normalizing surrounding and repeated whitespace", () => {
    expect(normalizeUnitDisplayValue("  Milli   Liter  ")).toBe("Milli Liter");
    expect(normalizeUnitKey("  Milli   Liter  ")).toBe("milli liter");
  });

  it("returns normalized identity keys without changing the display values", () => {
    const result = unitSchema.safeParse({
      name: "  Milli   Liter  ",
      abbreviation: " mL ",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toEqual({
      name: "Milli Liter",
      abbreviation: "mL",
      normalizedName: "milli liter",
      normalizedAbbreviation: "ml",
    });
  });

  it("reports required and length validation on the correct fields", () => {
    const result = unitSchema.safeParse({
      name: "   ",
      abbreviation: "x".repeat(31),
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(unitFieldErrors(result.error)).toEqual({
      name: ["Unit name is required"],
      abbreviation: ["Unit abbreviation must be 30 characters or fewer"],
    });
  });
});
