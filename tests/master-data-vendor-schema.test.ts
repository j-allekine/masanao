import { describe, expect, it } from "vitest";

import {
  normalizeVendorDisplayValue,
  normalizeVendorKey,
} from "@/features/master-data/domain/vendor";
import {
  vendorFieldErrors,
  vendorSchema,
} from "@/features/master-data/schemas/vendor";

describe("Master Data Vendor normalization", () => {
  it("trims display values while preserving casing and normalizes comparison keys", () => {
    expect(normalizeVendorDisplayValue("  Acme   Foods  ")).toBe(
      "Acme   Foods",
    );
    expect(normalizeVendorKey("  Acme   Foods  ")).toBe("acme   foods");
  });

  it("turns blank optional values into null", () => {
    const result = vendorSchema.safeParse({
      name: "  Acme Foods  ",
      contactPerson: "   ",
      contactNumber: "  0917 000 0001  ",
      email: "  alice@example.test  ",
      address: "   ",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toEqual({
      name: "Acme Foods",
      contactPerson: null,
      contactNumber: "0917 000 0001",
      email: "alice@example.test",
      address: null,
    });
  });

  it("reports required, length, and email validation on the correct fields", () => {
    const result = vendorSchema.safeParse({
      name: "   ",
      contactPerson: "x".repeat(151),
      contactNumber: "x".repeat(51),
      email: "not-an-email",
      address: "x".repeat(501),
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(vendorFieldErrors(result.error)).toEqual({
      name: ["Vendor name is required"],
      contactPerson: ["Contact person must be 150 characters or fewer"],
      contactNumber: ["Contact number must be 50 characters or fewer"],
      email: ["Email must be a valid email address"],
      address: ["Address must be 500 characters or fewer"],
    });
  });
});
