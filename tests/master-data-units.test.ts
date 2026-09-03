import { beforeEach, describe, expect, it } from "vitest";

import {
  createUnit,
  deleteUnit,
  listUnits,
  setUnitActive,
  updateUnit,
} from "@/features/master-data/server";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";

const adminActor: CurrentActor = {
  id: "units-admin",
  name: "Municipal administrator",
  username: "municipal.admin",
};
const staffActor: CurrentActor = {
  id: "units-staff",
  name: "Kitchen staff",
  username: "kitchen.staff",
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

describe("Master Data Units gateway", () => {
  beforeEach(async () => {
    await prisma.unit.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("keeps display values and persists hidden normalized identity keys", async () => {
    await createActorUser(adminActor, "admin");

    const result = await createUnit(adminActor, {
      name: "  Milli   Liter  ",
      abbreviation: " mL ",
    });

    expect(result).toMatchObject({
      ok: true,
      unit: {
        name: "Milli Liter",
        abbreviation: "mL",
        active: true,
      },
    });

    if (!result.ok) return;

    await expect(
      prisma.unit.findUnique({ where: { id: result.unit.id } }),
    ).resolves.toMatchObject({
      name: "Milli Liter",
      abbreviation: "mL",
      normalizedName: "milli liter",
      normalizedAbbreviation: "ml",
      active: true,
    });
  });

  it("rejects duplicate normalized names and abbreviations independently", async () => {
    await createActorUser(adminActor, "admin");
    const first = await createUnit(adminActor, { name: "Gram", abbreviation: "g" });
    expect(first.ok).toBe(true);

    await expect(
      createUnit(adminActor, { name: " gram ", abbreviation: "gram-unit" }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: { name: ["A Unit with that name already exists."] },
    });

    await expect(
      createUnit(adminActor, { name: "Kilogram", abbreviation: " G " }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: {
        abbreviation: ["A Unit with that abbreviation already exists."],
      },
    });
  });

  it("restricts every write gateway to administrators", async () => {
    await createActorUser(adminActor, "admin");
    await createActorUser(staffActor);

    const created = await createUnit(adminActor, {
      name: "Piece",
      abbreviation: "pc",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await expect(
      createUnit(staffActor, { name: "Box", abbreviation: "box" }),
    ).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
      fields: {},
    });
    await expect(
      updateUnit(staffActor, created.unit.id, {
        name: "Updated Piece",
        abbreviation: "upc",
      }),
    ).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
      fields: {},
    });
    await expect(
      setUnitActive(staffActor, created.unit.id, false),
    ).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
    await expect(deleteUnit(staffActor, created.unit.id)).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
  });

  it("supports edit, lifecycle, deterministic listing, and safe missing-record responses", async () => {
    await createActorUser(adminActor, "admin");
    const zulu = await createUnit(adminActor, {
      name: "zulu",
      abbreviation: "z",
    });
    const alpha = await createUnit(adminActor, {
      name: "Alpha",
      abbreviation: "a",
    });
    expect(zulu.ok && alpha.ok).toBe(true);
    if (!zulu.ok || !alpha.ok) return;

    const updated = await updateUnit(adminActor, zulu.unit.id, {
      name: "Beta",
      abbreviation: "b",
    });
    expect(updated).toMatchObject({
      ok: true,
      unit: { name: "Beta", abbreviation: "b", active: true },
    });

    await expect(setUnitActive(adminActor, alpha.unit.id, false)).resolves.toMatchObject({
      ok: true,
      unit: { active: false },
    });
    await expect(listUnits()).resolves.toMatchObject([
      { name: "Alpha", abbreviation: "a", active: false },
      { name: "Beta", abbreviation: "b", active: true },
    ]);

    await expect(deleteUnit(adminActor, alpha.unit.id)).resolves.toEqual({
      ok: true,
    });
    await expect(deleteUnit(adminActor, alpha.unit.id)).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Unit could not be found.",
    });
    await expect(
      updateUnit(adminActor, "missing-unit", {
        name: "Missing",
        abbreviation: "m",
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "not-found",
    });
  });
});
