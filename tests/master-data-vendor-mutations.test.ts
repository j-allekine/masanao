import { beforeEach, describe, expect, it } from "vitest";

import {
  createVendor,
  deleteVendor,
  setVendorActive,
  updateVendor,
} from "@/features/master-data/server";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";

const adminActor: CurrentActor = {
  id: "vendors-admin",
  name: "Municipal administrator",
  username: "municipal.admin",
};
const staffActor: CurrentActor = {
  id: "vendors-staff",
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

describe("Master Data Vendor mutation gateway", () => {
  beforeEach(async () => {
    await prisma.vendor.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("creates an active Vendor with trimmed display values and null optional blanks", async () => {
    await createActorUser(adminActor, "admin");

    const result = await createVendor(adminActor, {
      name: "  Acme Foods  ",
      contactPerson: "  Alice Reyes  ",
      contactNumber: "   ",
      email: " alice@example.test ",
      address: "  Municipal Market  ",
    });

    expect(result).toMatchObject({
      ok: true,
      vendor: {
        name: "Acme Foods",
        contactPerson: "Alice Reyes",
        contactNumber: null,
        email: "alice@example.test",
        address: "Municipal Market",
        isActive: true,
      },
    });
  });

  it("rejects case-insensitive duplicates across inactive Vendors", async () => {
    await createActorUser(adminActor, "admin");
    const created = await createVendor(adminActor, { name: "Acme Foods" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await prisma.vendor.update({
      where: { id: created.vendor.id },
      data: { isActive: false },
    });

    await expect(
      createVendor(adminActor, { name: " acme foods " }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "duplicate",
      fields: { name: ["A Vendor with that name already exists."] },
    });
  });

  it("allows an edit to keep its own normalized name and preserves status", async () => {
    await createActorUser(adminActor, "admin");
    const created = await createVendor(adminActor, {
      name: "Acme Foods",
      contactPerson: "Alice",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await prisma.vendor.update({
      where: { id: created.vendor.id },
      data: { isActive: false },
    });

    await expect(
      updateVendor(adminActor, created.vendor.id, {
        name: " ACME FOODS ",
        contactPerson: "   ",
      }),
    ).resolves.toMatchObject({
      ok: true,
      vendor: {
        name: "ACME FOODS",
        contactPerson: null,
        isActive: false,
      },
    });
  });

  it("rejects every Vendor write from authenticated non-administrators", async () => {
    await createActorUser(adminActor, "admin");
    await createActorUser(staffActor);
    const created = await createVendor(adminActor, { name: "Acme Foods" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await expect(
      createVendor(staffActor, { name: "Staff Vendor" }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "forbidden",
      fields: {},
    });
    await expect(
      updateVendor(staffActor, created.vendor.id, { name: "Changed" }),
    ).resolves.toMatchObject({
      ok: false,
      kind: "forbidden",
      fields: {},
    });
    await expect(
      setVendorActive(staffActor, created.vendor.id, false),
    ).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
    await expect(deleteVendor(staffActor, created.vendor.id)).resolves.toEqual({
      ok: false,
      kind: "forbidden",
      error: "Administrator access required",
    });
  });

  it("supports lifecycle changes, safe deletion, and missing-record responses", async () => {
    await createActorUser(adminActor, "admin");
    const created = await createVendor(adminActor, { name: "Acme Foods" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await expect(
      setVendorActive(adminActor, created.vendor.id, false),
    ).resolves.toMatchObject({
      ok: true,
      vendor: { name: "Acme Foods", isActive: false },
    });
    await expect(
      setVendorActive(adminActor, created.vendor.id, true),
    ).resolves.toMatchObject({
      ok: true,
      vendor: { name: "Acme Foods", isActive: true },
    });

    await expect(deleteVendor(adminActor, created.vendor.id)).resolves.toEqual({
      ok: true,
    });
    await expect(deleteVendor(adminActor, created.vendor.id)).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Vendor could not be found.",
    });
    await expect(
      setVendorActive(adminActor, "missing-vendor", false),
    ).resolves.toEqual({
      ok: false,
      kind: "not-found",
      error: "The Vendor could not be found.",
    });
  });
});
