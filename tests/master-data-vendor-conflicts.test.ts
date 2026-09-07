import { afterEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/prisma/generated/client";
import * as vendorDb from "@/features/master-data/server/db/vendors";
import { createVendorCommand } from "@/features/master-data/server/commands/create-vendor";
import { updateVendorCommand } from "@/features/master-data/server/commands/update-vendor";

function uniqueConstraintError(target: string) {
  return new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed on the fields: (`name`)",
    {
      code: "P2002",
      clientVersion: "7.10.0",
      meta: { target: [target] },
    },
  );
}

const input = {
  name: "Acme Foods",
  contactPerson: "Alice Reyes",
  contactNumber: null,
  email: null,
  address: null,
};

describe("Master Data Vendor unique conflicts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a late case-insensitive name collision during create to the name field", async () => {
    vi.spyOn(vendorDb, "findVendorConflictRecord").mockResolvedValue(false);
    vi.spyOn(vendorDb, "createVendorRecord").mockRejectedValue(
      uniqueConstraintError("name"),
    );

    await expect(createVendorCommand(input)).resolves.toEqual({
      ok: false,
      kind: "duplicate",
      error: "A Vendor with that name already exists.",
      fields: { name: ["A Vendor with that name already exists."] },
    });
  });

  it("maps a late case-insensitive name collision during update to the name field", async () => {
    vi.spyOn(vendorDb, "findVendorConflictRecord").mockResolvedValue(false);
    vi.spyOn(vendorDb, "updateVendorRecord").mockRejectedValue(
      uniqueConstraintError("vendor_name_nocase_key"),
    );

    await expect(updateVendorCommand("vendor-1", input)).resolves.toEqual({
      ok: false,
      kind: "duplicate",
      error: "A Vendor with that name already exists.",
      fields: { name: ["A Vendor with that name already exists."] },
    });
  });
});
