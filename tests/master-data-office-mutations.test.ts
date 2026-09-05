import { beforeEach, describe, expect, it } from "vitest";

import {
  createOffice,
  deleteOffice,
  setOfficeActive,
  updateOffice,
} from "@/features/master-data/server";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";

const adminActor: CurrentActor = {
  id: "offices-admin",
  name: "Municipal administrator",
  username: "municipal.admin.offices",
};
const staffActor: CurrentActor = {
  id: "offices-staff",
  name: "Kitchen staff",
  username: "kitchen.staff.offices",
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

describe("Master Data Office mutation gateway", () => {
  beforeEach(async () => {
    await prisma.office.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("creates the approved directory fields with trimmed display values and an active default", async () => {
    await createActorUser(adminActor, "admin");

    const result = await createOffice(adminActor, {
      name: "  Municipal  Health Office  ",
      abbreviation: " MHO ",
      headName: "  Alex Santos ",
      headDesignation: "  Department Head ",
      officialEmail: " mayor@example.test ",
      contactNumber: " 0917 000 0001 ",
    });

    expect(result).toMatchObject({
      ok: true,
      office: {
        name: "Municipal  Health Office",
        abbreviation: "MHO",
        headName: "Alex Santos",
        headDesignation: "Department Head",
        officialEmail: "mayor@example.test",
        contactNumber: "0917 000 0001",
        isActive: true,
      },
    });

    if (!result.ok) return;

    await expect(
      prisma.office.findUnique({ where: { id: result.office.id } }),
    ).resolves.toMatchObject({
      name: "Municipal  Health Office",
      abbreviation: "MHO",
      headName: "Alex Santos",
      headDesignation: "Department Head",
      officialEmail: "mayor@example.test",
      contactNumber: "0917 000 0001",
      isActive: true,
    });
  });

  it("treats optional blanks as null and rejects duplicates across every status", async () => {
    await createActorUser(adminActor, "admin");

    const first = await createOffice(adminActor, {
      name: "Municipal Treasurer's Office",
      abbreviation: "MTO",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    await prisma.office.update({
      where: { id: first.office.id },
      data: { isActive: false },
    });

    await expect(
      createOffice(adminActor, {
        name: " municipal treasurer's office ",
        abbreviation: "other",
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: { name: ["An Office with that name already exists."] },
    });

    await expect(
      createOffice(adminActor, {
        name: "Municipal Budget Office",
        abbreviation: " mto ",
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: {
        abbreviation: ["An Office with that abbreviation already exists."],
      },
    });

    const blankOptionalFields = await createOffice(adminActor, {
      name: "Municipal Budget Office",
      abbreviation: "MBO",
      headName: "   ",
      headDesignation: " ",
      officialEmail: "\t",
      contactNumber: "  ",
    });
    expect(blankOptionalFields).toMatchObject({
      ok: true,
      office: {
        abbreviation: "MBO",
        headName: null,
        headDesignation: null,
        officialEmail: null,
        contactNumber: null,
      },
    });
  });

  it("allows self-normalized edits, preserves status, and rejects other-office conflicts without changing the record", async () => {
    await createActorUser(adminActor, "admin");

    const first = await createOffice(adminActor, {
      name: "Mayor's Office",
      abbreviation: "MO",
    });
    const second = await createOffice(adminActor, {
      name: "Municipal Planning Office",
      abbreviation: "MPO",
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    await prisma.office.update({
      where: { id: first.office.id },
      data: { isActive: false },
    });

    await expect(
      updateOffice(adminActor, first.office.id, {
        name: " mayor's office ",
        abbreviation: " mo ",
        headName: "Alex Santos",
      }),
    ).resolves.toMatchObject({
      ok: true,
      office: {
        name: "mayor's office",
        abbreviation: "mo",
        headName: "Alex Santos",
        isActive: false,
      },
    });

    await expect(
      updateOffice(adminActor, first.office.id, {
        name: "Municipal Planning Office",
        abbreviation: "different",
      }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: { name: ["An Office with that name already exists."] },
    });

    await expect(
      prisma.office.findUnique({ where: { id: first.office.id } }),
    ).resolves.toMatchObject({
      name: "mayor's office",
      abbreviation: "mo",
      headName: "Alex Santos",
      isActive: false,
    });
  });

  it("restricts create and edit to administrators", async () => {
    await createActorUser(adminActor, "admin");
    await createActorUser(staffActor);

    await expect(
      createOffice(staffActor, { name: "Staff Office" }),
    ).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
      fields: {},
    });

    const created = await createOffice(adminActor, {
      name: "Office to Protect",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await expect(
      updateOffice(staffActor, created.office.id, { name: "Unauthorized" }),
    ).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
      fields: {},
    });

    await expect(
      setOfficeActive(staffActor, created.office.id, false),
    ).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
    await expect(deleteOffice(staffActor, created.office.id)).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
  });

  it("supports lifecycle changes, deletion confirmation's server contract, and safe repeated requests", async () => {
    await createActorUser(adminActor, "admin");

    const created = await createOffice(adminActor, {
      name: "Office to Retire",
      abbreviation: "OTR",
      headName: "Alex Santos",
      officialEmail: "retire@example.test",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const deactivated = await setOfficeActive(
      adminActor,
      created.office.id,
      false,
    );
    expect(deactivated).toMatchObject({
      ok: true,
      office: {
        name: "Office to Retire",
        abbreviation: "OTR",
        headName: "Alex Santos",
        officialEmail: "retire@example.test",
        isActive: false,
      },
    });

    const reactivated = await setOfficeActive(
      adminActor,
      created.office.id,
      true,
    );
    expect(reactivated).toMatchObject({
      ok: true,
      office: { isActive: true },
    });

    await expect(deleteOffice(adminActor, created.office.id)).resolves.toEqual(
      { ok: true },
    );
    await expect(deleteOffice(adminActor, created.office.id)).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Office could not be found.",
    });
    await expect(
      setOfficeActive(adminActor, created.office.id, false),
    ).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Office could not be found.",
    });
  });
});
