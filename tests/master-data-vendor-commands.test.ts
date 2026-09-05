import { afterEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/prisma/generated/client";
import { deleteVendorCommand } from "@/features/master-data/server/commands/delete-vendor";
import { setVendorActiveCommand } from "@/features/master-data/server/commands/set-vendor-active";
import * as vendorDb from "@/features/master-data/server/db/vendors";
import type { VendorListItem } from "@/features/master-data/types";

const vendor: VendorListItem = {
  id: "vendor-1",
  name: "Acme Foods",
  contactPerson: null,
  contactNumber: null,
  email: null,
  address: null,
  isActive: true,
};

function recordNotFoundError() {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "7.10.0",
  });
}

describe("Master Data Vendor lifecycle commands", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("changes status and returns the updated Vendor", async () => {
    vi.spyOn(vendorDb, "setVendorActiveRecord").mockResolvedValue({
      ...vendor,
      isActive: false,
    });

    await expect(setVendorActiveCommand(vendor.id, false)).resolves.toEqual({
      ok: true,
      vendor: { ...vendor, isActive: false },
    });
  });

  it("maps a missing Vendor during status changes", async () => {
    vi.spyOn(vendorDb, "setVendorActiveRecord").mockRejectedValue(
      recordNotFoundError(),
    );

    await expect(setVendorActiveCommand(vendor.id, false)).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Vendor could not be found.",
    });
  });

  it("maps missing and future-reference failures during deletion", async () => {
    vi.spyOn(vendorDb, "deleteVendorRecord").mockResolvedValue(null);
    await expect(deleteVendorCommand(vendor.id)).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Vendor could not be found.",
    });

    vi.spyOn(vendorDb, "deleteVendorRecord").mockResolvedValue({
      deleted: false,
      referenced: true,
    });
    await expect(deleteVendorCommand(vendor.id)).resolves.toEqual({
      ok: false,
      kind: "referenced",
      error:
        "This Vendor cannot be deleted because it is already referenced by procurement or receiving records.",
    });
  });

  it("recognizes restrictive relation errors without requiring a relation now", () => {
    for (const code of ["P2003", "P2014"] as const) {
      const error = new Prisma.PrismaClientKnownRequestError(
        "Restrictive relation",
        { code, clientVersion: "7.10.0" },
      );
      expect(vendorDb.isRestrictiveRelationViolation(error)).toBe(true);
    }
  });
});
