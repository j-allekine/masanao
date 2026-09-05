import { afterEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/prisma/generated/client";
import { deleteOfficeCommand } from "@/features/master-data/server/commands/delete-office";
import { setOfficeActiveCommand } from "@/features/master-data/server/commands/set-office-active";
import * as officeDb from "@/features/master-data/server/db/offices";
import type { OfficeListItem } from "@/features/master-data/types";

const office: OfficeListItem = {
  id: "office-1",
  name: "Municipal Health Office",
  abbreviation: "MHO",
  headName: "Alex Santos",
  headDesignation: "Department Head",
  officialEmail: "health@example.test",
  contactNumber: "0917 000 0001",
  isActive: true,
  createdAt: "2026-09-06T00:00:00.000Z",
  updatedAt: "2026-09-06T00:00:00.000Z",
};

function recordNotFoundError() {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "7.10.0",
  });
}

describe("Master Data Office mutation commands", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("changes status and returns the updated Office", async () => {
    vi.spyOn(officeDb, "setOfficeActiveRecord").mockResolvedValue({
      ...office,
      isActive: false,
    });

    await expect(setOfficeActiveCommand(office.id, false)).resolves.toEqual({
      ok: true,
      office: { ...office, isActive: false },
    });
  });

  it("maps a missing Office during status changes", async () => {
    vi.spyOn(officeDb, "setOfficeActiveRecord").mockRejectedValue(
      recordNotFoundError(),
    );

    await expect(setOfficeActiveCommand(office.id, false)).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Office could not be found.",
    });
  });

  it("maps a missing Office during deletion", async () => {
    vi.spyOn(officeDb, "deleteOfficeRecord").mockResolvedValue(null);

    await expect(deleteOfficeCommand(office.id)).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Office could not be found.",
    });
  });

  it("maps a future restrictive reference during deletion", async () => {
    vi.spyOn(officeDb, "deleteOfficeRecord").mockResolvedValue({
      deleted: false,
      referenced: true,
    });

    await expect(deleteOfficeCommand(office.id)).resolves.toEqual({
      ok: false,
      kind: "referenced",
      error:
        "This Office cannot be deleted because it is already referenced by other records.",
    });
  });
});
