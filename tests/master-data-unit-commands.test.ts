import { afterEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/prisma/generated/client";
import { deleteUnitCommand } from "@/features/master-data/server/commands/delete-unit";
import { setUnitActiveCommand } from "@/features/master-data/server/commands/set-unit-active";
import * as unitDb from "@/features/master-data/server/db/units";
import type { UnitListItem } from "@/features/master-data/types";

const unit: UnitListItem = {
  id: "unit-1",
  name: "Kilogram",
  abbreviation: "kg",
  active: true,
};

function recordNotFoundError() {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "7.10.0",
  });
}

describe("Master Data Unit mutation commands", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("changes status and returns the updated Unit", async () => {
    vi.spyOn(unitDb, "setUnitActiveRecord").mockResolvedValue({
      ...unit,
      active: false,
    });

    await expect(setUnitActiveCommand(unit.id, false)).resolves.toEqual({
      ok: true,
      unit: { ...unit, active: false },
    });
  });

  it("maps a missing Unit during status changes", async () => {
    vi.spyOn(unitDb, "setUnitActiveRecord").mockRejectedValue(
      recordNotFoundError(),
    );

    await expect(setUnitActiveCommand(unit.id, false)).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Unit could not be found.",
    });
  });

  it("maps a missing Unit during deletion", async () => {
    vi.spyOn(unitDb, "deleteUnitRecord").mockResolvedValue(null);

    await expect(deleteUnitCommand(unit.id)).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Unit could not be found.",
    });
  });

  it("maps referenced Units during deletion", async () => {
    vi.spyOn(unitDb, "deleteUnitRecord").mockResolvedValue({
      deleted: false,
      referenced: true,
    });

    await expect(deleteUnitCommand(unit.id)).resolves.toEqual({
      ok: false,
      kind: "referenced",
      error:
        "This Unit cannot be deleted because it is already referenced by other records.",
    });
  });
});
