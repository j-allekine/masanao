import { beforeEach, describe, expect, it } from "vitest";

import {
  createCategory,
  deleteCategory,
  listCategories,
  setCategoryActive,
  updateCategory,
} from "@/features/master-data/server";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";

const adminActor: CurrentActor = {
  id: "categories-admin",
  name: "Municipal administrator",
  username: "categories.admin",
};
const staffActor: CurrentActor = {
  id: "categories-staff",
  name: "Kitchen staff",
  username: "categories.staff",
};

async function createActorUser(actor: CurrentActor, role = "staff") {
  await prisma.user.create({
    data: {
      id: actor.id,
      name: actor.name,
      email: `${actor.username}@internal.masanao`,
      username: actor.username,
      role,
    },
  });
}

describe("Master Data Categories gateway", () => {
  beforeEach(async () => {
    await prisma.category.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("persists the approved fields, default active state, timestamps, and null descriptions", async () => {
    await createActorUser(adminActor, "admin");

    const result = await createCategory(adminActor, {
      name: "  Rice   & Grains  ",
      description: "   ",
    });

    expect(result).toMatchObject({
      ok: true,
      category: {
        name: "Rice   & Grains",
        description: null,
        isActive: true,
      },
    });

    if (!result.ok) return;

    expect(result.category).not.toHaveProperty("normalizedName");
    expect(result.category.createdAt).toBeTruthy();
    expect(result.category.updatedAt).toBeTruthy();
    await expect(
      prisma.category.findUnique({ where: { id: result.category.id } }),
    ).resolves.toMatchObject({
      name: "Rice   & Grains",
      description: null,
      normalizedName: "rice   & grains",
      isActive: true,
    });
  });

  it("rejects case-insensitive duplicates across active and inactive records", async () => {
    await createActorUser(adminActor, "admin");
    const first = await createCategory(adminActor, {
      name: "Vegetables",
      description: "Fresh produce",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    await expect(setCategoryActive(adminActor, first.category.id, false)).resolves.toMatchObject({
      ok: true,
      category: { isActive: false },
    });

    await expect(
      createCategory(adminActor, {
        name: " vegetables ",
        description: "Another label",
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: { name: ["A Category with that name already exists."] },
    });
  });

  it("enforces the normalized name key at the database boundary", async () => {
    await expect(
      prisma.category.create({
        data: {
          id: "direct-category-1",
          name: "Vegetables",
          normalizedName: "vegetables",
        },
      }),
    ).resolves.toBeTruthy();

    await expect(
      prisma.category.create({
        data: {
          id: "direct-category-2",
          name: "vegetables",
          normalizedName: "vegetables",
        },
      }),
    ).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("restricts every Category write gateway to administrators", async () => {
    await createActorUser(adminActor, "admin");
    await createActorUser(staffActor);

    const created = await createCategory(adminActor, { name: "Produce" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await expect(
      createCategory(staffActor, { name: "Office supplies" }),
    ).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
      fields: {},
    });
    await expect(
      updateCategory(staffActor, created.category.id, { name: "Updated" }),
    ).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
      fields: {},
    });
    await expect(
      setCategoryActive(staffActor, created.category.id, false),
    ).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
    await expect(deleteCategory(staffActor, created.category.id)).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
  });

  it("supports edit, explicit lifecycle state, deterministic listing, and safe deletion", async () => {
    await createActorUser(adminActor, "admin");
    const zulu = await createCategory(adminActor, { name: "zulu" });
    const alpha = await createCategory(adminActor, { name: "Alpha" });
    expect(zulu.ok && alpha.ok).toBe(true);
    if (!zulu.ok || !alpha.ok) return;

    const updated = await updateCategory(adminActor, zulu.category.id, {
      name: "Beta",
      description: "Updated description",
    });
    expect(updated).toMatchObject({
      ok: true,
      category: {
        name: "Beta",
        description: "Updated description",
        isActive: true,
      },
    });

    await expect(
      setCategoryActive(adminActor, alpha.category.id, false),
    ).resolves.toMatchObject({
      ok: true,
      category: { isActive: false },
    });
    await expect(
      setCategoryActive(adminActor, alpha.category.id, false),
    ).resolves.toMatchObject({
      ok: true,
      category: { isActive: false },
    });
    await expect(listCategories()).resolves.toMatchObject([
      { name: "Alpha", isActive: false },
      { name: "Beta", isActive: true },
    ]);

    await expect(deleteCategory(adminActor, alpha.category.id)).resolves.toEqual({
      ok: true,
    });
    await expect(deleteCategory(adminActor, alpha.category.id)).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Category could not be found.",
    });
    await expect(
      updateCategory(adminActor, "missing-category", { name: "Missing" }),
    ).resolves.toMatchObject({ ok: false, kind: "not-found" });
  });
});
