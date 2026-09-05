import { afterEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/prisma/generated/client";
import * as officeDb from "@/features/master-data/server/db/offices";
import { createOfficeCommand } from "@/features/master-data/server/commands/create-office";
import { updateOfficeCommand } from "@/features/master-data/server/commands/update-office";

function uniqueConstraintError(target: string) {
  return new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed",
    {
      code: "P2002",
      clientVersion: "7.10.0",
      meta: { target: [target] },
    },
  );
}

describe("Master Data Office unique conflicts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports a late abbreviation collision on the abbreviation field during create", async () => {
    vi.spyOn(officeDb, "findOfficeConflictRecord").mockResolvedValue(null);
    vi.spyOn(officeDb, "createOfficeRecord").mockRejectedValue(
      uniqueConstraintError("office_abbreviation_nocase_key"),
    );

    await expect(
      createOfficeCommand({ name: "Treasurer's Office", abbreviation: "TO" }),
    ).resolves.toEqual({
      ok: false,
      kind: "duplicate",
      error: "An Office with that abbreviation already exists.",
      fields: {
        abbreviation: ["An Office with that abbreviation already exists."],
      },
    });
  });

  it("reports a late name collision on the name field during update", async () => {
    vi.spyOn(officeDb, "findOfficeConflictRecord").mockResolvedValue(null);
    vi.spyOn(officeDb, "updateOfficeRecord").mockRejectedValue(
      uniqueConstraintError("office_name_nocase_key"),
    );

    await expect(
      updateOfficeCommand("office-1", { name: "Treasurer's Office" }),
    ).resolves.toEqual({
      ok: false,
      kind: "duplicate",
      error: "An Office with that name already exists.",
      fields: {
        name: ["An Office with that name already exists."],
      },
    });
  });
});
