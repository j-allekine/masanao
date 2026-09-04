import { afterEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/prisma/generated/client";
import * as unitDb from "@/features/master-data/server/db/units";
import { createUnitCommand } from "@/features/master-data/server/commands/create-unit";
import { updateUnitCommand } from "@/features/master-data/server/commands/update-unit";

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

describe("Master Data Unit unique conflicts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports a late abbreviation collision on the abbreviation field during create", async () => {
    vi.spyOn(unitDb, "findUnitConflictRecord").mockResolvedValue(null);
    vi.spyOn(unitDb, "createUnitRecord").mockRejectedValue(
      uniqueConstraintError("normalizedAbbreviation"),
    );

    await expect(
      createUnitCommand({ name: "Kilogram", abbreviation: "kg" }),
    ).resolves.toEqual({
      ok: false,
      kind: "duplicate",
      error: "A Unit with that abbreviation already exists.",
      fields: {
        abbreviation: ["A Unit with that abbreviation already exists."],
      },
    });
  });

  it("reports a late abbreviation collision on the abbreviation field during update", async () => {
    vi.spyOn(unitDb, "findUnitConflictRecord").mockResolvedValue(null);
    vi.spyOn(unitDb, "updateUnitRecord").mockRejectedValue(
      uniqueConstraintError("normalizedAbbreviation"),
    );

    await expect(
      updateUnitCommand("unit-1", { name: "Kilogram", abbreviation: "kg" }),
    ).resolves.toEqual({
      ok: false,
      kind: "duplicate",
      error: "A Unit with that abbreviation already exists.",
      fields: {
        abbreviation: ["A Unit with that abbreviation already exists."],
      },
    });
  });
});
