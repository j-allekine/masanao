import { describe, expect, it } from "vitest";

import { filterVendors } from "@/features/master-data/components/vendor-filters";
import { getVendorResultsSummary } from "@/features/master-data/components/vendor-pagination";
import {
  getMasterDataListState,
  masterDataTabs,
} from "@/features/master-data/components/master-data-list-state";
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
      await prisma.vendor.create({ data: vendor });
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

    expect(table[0]?.sql).toContain('"isActive" BOOLEAN NOT NULL DEFAULT true');
    expect(table[0]?.sql).not.toContain("normalized");
    expect(indexes[0]?.sql).toContain("COLLATE NOCASE");

    const created = await prisma.vendor.create({
      data: { id: "case-sensitive", name: "Acme Foods" },
    });

    expect(created.isActive).toBe(true);
    expect(created.name).toBe("Acme Foods");
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);

    await expect(
      prisma.vendor.create({
        data: { id: "duplicate", name: "acme foods" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    await expect(
      prisma.vendor.create({
        data: { id: "not-trimmed", name: " Acme Supplies " },
      }),
    ).rejects.toThrow();
  });
});
