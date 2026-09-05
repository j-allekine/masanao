import { afterEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/prisma/generated/client";
import { deleteCategoryCommand } from "@/features/master-data/server/commands/delete-category";
import { setCategoryActiveCommand } from "@/features/master-data/server/commands/set-category-active";
import * as categoryDb from "@/features/master-data/server/db/categories";
import type { CategoryListItem } from "@/features/master-data/types";

const category: CategoryListItem = {
  id: "category-1",
  name: "Rice & Grains",
  description: "Staple grains",
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

describe("Master Data Category mutation commands", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [true, true],
    [false, false],
  ])(
    "sets the requested active state explicitly and can be repeated (%s)",
    async (requestedState, returnedState) => {
      vi.spyOn(categoryDb, "setCategoryActiveRecord").mockResolvedValue({
        ...category,
        isActive: returnedState,
      });

      await expect(
        setCategoryActiveCommand(category.id, requestedState),
      ).resolves.toEqual({
        ok: true,
        category: { ...category, isActive: returnedState },
      });
      expect(categoryDb.setCategoryActiveRecord).toHaveBeenCalledWith(
        category.id,
        requestedState,
      );
    },
  );

  it("maps a missing Category during status changes", async () => {
    vi.spyOn(categoryDb, "setCategoryActiveRecord").mockRejectedValue(
      recordNotFoundError(),
    );

    await expect(
      setCategoryActiveCommand(category.id, false),
    ).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Category could not be found.",
    });
  });

  it("maps a missing Category during deletion", async () => {
    vi.spyOn(categoryDb, "deleteCategoryRecord").mockResolvedValue(null);

    await expect(deleteCategoryCommand(category.id)).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Category could not be found.",
    });
  });

  it("keeps the future restrictive reference outcome", async () => {
    vi.spyOn(categoryDb, "deleteCategoryRecord").mockResolvedValue({
      deleted: false,
      referenced: true,
    });

    await expect(deleteCategoryCommand(category.id)).resolves.toEqual({
      ok: false,
      kind: "referenced",
      error:
        "This Category cannot be deleted because it is already referenced by other records.",
    });
  });
});
