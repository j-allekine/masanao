import { describe, expect, it } from "vitest";

import {
  normalizeOfficeDisplayValue,
  normalizeOfficeKey,
} from "@/features/master-data/domain/office";
import {
  officeFieldErrors,
  officeSchema,
} from "@/features/master-data/schemas/office";

describe("Master Data Office normalization", () => {
  it("preserves display casing while trimming identity values", () => {
    expect(normalizeOfficeDisplayValue("  Municipal  Health Office  ")).toBe(
      "Municipal  Health Office",
    );
    expect(normalizeOfficeKey("  Municipal  Health Office  ")).toBe(
      "municipal  health office",
    );
  });

  it("normalizes optional whitespace-only values to null", () => {
    const result = officeSchema.safeParse({
      name: "  Municipal Health Office  ",
      abbreviation: "  MHO ",
      headName: "   ",
      headDesignation: "  Department Head  ",
      officialEmail: " mayor@example.test ",
      contactNumber: " 0917 000 0001 ",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toEqual({
      name: "Municipal Health Office",
      abbreviation: "MHO",
      headName: null,
      headDesignation: "Department Head",
      officialEmail: "mayor@example.test",
      contactNumber: "0917 000 0001",
      normalizedName: "municipal health office",
      normalizedAbbreviation: "mho",
    });
  });

  it("accepts an Office without optional directory fields", () => {
    const result = officeSchema.safeParse({ name: "Treasurer's Office" });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toMatchObject({
      name: "Treasurer's Office",
      abbreviation: null,
      headName: null,
      headDesignation: null,
      officialEmail: null,
      contactNumber: null,
      normalizedName: "treasurer's office",
      normalizedAbbreviation: null,
    });
  });

  it("reports required, length, and email validation on the correct fields", () => {
    const result = officeSchema.safeParse({
      name: "   ",
      abbreviation: "x".repeat(21),
      headName: "x".repeat(201),
      headDesignation: "x".repeat(151),
      officialEmail: "not-an-email",
      contactNumber: "x".repeat(101),
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(officeFieldErrors(result.error)).toEqual({
      name: ["Office name is required"],
      abbreviation: ["Office abbreviation must be 20 characters or fewer"],
      headName: ["Head name must be 200 characters or fewer"],
      headDesignation: [
        "Head designation must be 150 characters or fewer",
      ],
      officialEmail: ["Official email must be a valid email address"],
      contactNumber: ["Contact number must be 100 characters or fewer"],
    });
  });
});
