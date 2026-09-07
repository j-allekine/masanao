import { describe, expect, it } from "vitest";

import { filterVendors } from "@/features/master-data/components/vendor-filters";
import { getVendorResultsSummary } from "@/features/master-data/components/vendor-pagination";
import {
  getMasterDataListState,
  masterDataTabs,
} from "@/features/master-data/components/master-data-list-state";
import { normalizeVendorKey } from "@/features/master-data/domain/vendor";
import { listVendors } from "@/features/master-data/server";
import type { VendorListItem } from "@/features/master-data/types";
import { prisma } from "@/prisma/client";

const vendors: VendorListItem[] = [
  {
    id: "alpha",
    name: "Alpha Foods",
    contactPerson: "Ana Santos",
    contactNumber: "0917 000 0001",
    email: "ana@example.test",
    address: "Municipal Market",
    isActive: true,
  },
  {
    id: "bravo",
    name: "Bravo Supply",
    contactPerson: null,
    contactNumber: null,
    email: null,
    address: null,
    isActive: false,
  },
];

function withNormalizedVendorName<T extends { name: string }>(data: T) {
  return {
    ...data,
    normalizedName: normalizeVendorKey(data.name),
  };
}

describe("Master Data Vendors read path", () => {
  it("enables Vendors while keeping Categories and Offices disabled", () => {
    expect(masterDataTabs).toEqual([
      { id: "units", label: "Units", disabled: false },
      { id: "categories", label: "Categories", disabled: true },
      { id: "offices", label: "Offices", disabled: true },
      { id: "vendors", label: "Vendors", disabled: false },
    ]);
    expect(getMasterDataListState("tab=vendors&search=  ana  &page=2")).toEqual(
      {
        tab: "vendors",
        search: "  ana  ",
        page: 2,
      },
    );
  });

  it("matches trimmed, case-insensitive Vendor name and contact searches", () => {
    expect(filterVendors(vendors, { search: "  FOODS  " })).toEqual([
      vendors[0],
    ]);
    expect(filterVendors(vendors, { search: "sAnToS" })).toEqual([vendors[0]]);
    expect(filterVendors(vendors, { search: "missing" })).toEqual([]);
  });

  it("reports empty, single-result, and ten-row ranges truthfully", () => {
    expect(getVendorResultsSummary({ start: 0, end: 0, total: 0 })).toBe(
      "No results",
    );
    expect(getVendorResultsSummary({ start: 1, end: 1, total: 1 })).toBe(
      "Showing 1 result",
    );
    expect(getVendorResultsSummary({ start: 11, end: 11, total: 11 })).toBe(
      "Showing 11 to 11 of 11 results",
    );
  });

  it("lists active and inactive Vendors with only the public read fields", async () => {
    await prisma.vendor.deleteMany();
    for (const vendor of vendors) {
      await prisma.vendor.create({ data: withNormalizedVendorName(vendor) });
    }

    await expect(listVendors()).resolves.toEqual(vendors);
  });
});

describe("Vendor persistence contract", () => {
  it("uses a case-insensitive unique name index and defaults new rows active", async () => {
    await prisma.vendor.deleteMany();

    const table = await prisma.$queryRaw<Array<{ sql: string }>>`
      SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'vendor'
    `;
    const indexes = await prisma.$queryRaw<Array<{ sql: string }>>`
      SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'vendor_name_nocase_key'
    `;
    const normalizedIndexes = await prisma.$queryRaw<Array<{ sql: string }>>`
      SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'vendor_normalized_name_key'
    `;

    expect(table[0]?.sql).toContain('"isActive" BOOLEAN NOT NULL DEFAULT true');
    expect(table[0]?.sql).toContain('"normalizedName" TEXT NOT NULL');
    expect(indexes[0]?.sql).toContain("COLLATE NOCASE");
    expect(normalizedIndexes[0]?.sql).toContain('"normalizedName"');

    const created = await prisma.vendor.create({
      data: withNormalizedVendorName({ id: "case-sensitive", name: "Acme Foods" }),
    });

    expect(created.isActive).toBe(true);
    expect(created.name).toBe("Acme Foods");
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);

    await expect(
      prisma.vendor.create({
        data: withNormalizedVendorName({ id: "duplicate", name: "acme foods" }),
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    await expect(
      prisma.vendor.create({
        data: withNormalizedVendorName({
          id: "not-trimmed",
          name: " Acme Supplies ",
        }),
      }),
    ).rejects.toThrow();

    await expect(
      prisma.vendor.create({
        data: withNormalizedVendorName({
          id: "unicode-upper",
          name: "Éclair Foods",
        }),
      }),
    ).resolves.toMatchObject({ normalizedName: "éclair foods" });

    await expect(
      prisma.vendor.create({
        data: withNormalizedVendorName({
          id: "unicode-lower",
          name: "éclair foods",
        }),
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("enforces normalized optional fields and practical email validity in SQLite", async () => {
    await prisma.vendor.deleteMany();

    await expect(
      prisma.vendor.create({
        data: withNormalizedVendorName({
          id: "valid-contact-data",
          name: "Valid Contact Data",
          contactPerson: "Alice Reyes",
          contactNumber: "+63 917 000 0001",
          email: "alice+office@example.com",
          address: "Municipal Market",
        }),
      }),
    ).resolves.toMatchObject({
      contactPerson: "Alice Reyes",
      contactNumber: "+63 917 000 0001",
      email: "alice+office@example.com",
      address: "Municipal Market",
    });

    for (const [field, value] of [
      ["contactPerson", "   "],
      ["contactNumber", "\t\n"],
      ["address", ""],
      ["contactPerson", "\u00a0"],
    ] as const) {
      await expect(
        prisma.vendor.create({
          data: withNormalizedVendorName({
            id: `invalid-${field}`,
            name: `Invalid ${field} ${JSON.stringify(value)}`,
            [field]: value,
          }),
        }),
      ).rejects.toThrow();
    }

    for (const [id, field, value] of [
      ["untrimmed-contact-person", "contactPerson", " Alice Reyes "],
      ["untrimmed-contact-number", "contactNumber", " 0917 000 0001 "],
      ["untrimmed-address", "address", " Municipal Market "],
      ["untrimmed-email", "email", " alice@example.com "],
      ["unicode-untrimmed-contact-person", "contactPerson", "\u00a0Alice Reyes\u00a0"],
    ] as const) {
      await expect(
        prisma.vendor.create({
          data: withNormalizedVendorName({
            id,
            name: id,
            [field]: value,
          }),
        }),
      ).rejects.toThrow();
    }

    for (const [id, email] of [
      ["invalid-email-shape", "not-an-email"],
      ["invalid-email-domain", "alice@example"],
      ["invalid-email-double-at", "alice@@example.com"],
      ["invalid-email-double-dot", "alice@example..com"],
      ["invalid-email-domain-hyphen", "alice@-example.com"],
    ] as const) {
      await expect(
        prisma.vendor.create({
          data: withNormalizedVendorName({ id, name: id, email }),
        }),
      ).rejects.toThrow();
    }

    await expect(
      prisma.vendor.create({
        data: withNormalizedVendorName({
          id: "null-optional-data",
          name: "Null Optional Data",
          contactPerson: null,
          contactNumber: null,
          email: null,
          address: null,
        }),
      }),
    ).resolves.toMatchObject({
      contactPerson: null,
      contactNumber: null,
      email: null,
      address: null,
    });
  });
});
