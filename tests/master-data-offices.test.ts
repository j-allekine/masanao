import { beforeEach, describe, expect, it } from "vitest";

import { filterOffices } from "@/features/master-data/components/office-filters";
import { getOfficeResultsSummary } from "@/features/master-data/components/office-pagination";
import {
  getMasterDataListState,
  masterDataTabs,
} from "@/features/master-data/components/master-data-list-state";
import { listOffices } from "@/features/master-data/server";
import type { OfficeListItem } from "@/features/master-data/types";
import { prisma } from "@/prisma/client";

const officeRows: OfficeListItem[] = [
  {
    id: "mayors-office",
    name: "Mayor's Office",
    abbreviation: "MO",
    headName: "Alex Santos",
    headDesignation: "Department Head",
    officialEmail: "mayor@example.test",
    contactNumber: "0917 000 0001",
    isActive: true,
    createdAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z",
  },
  {
    id: "health-office",
    name: "Municipal Health Office",
    abbreviation: null,
    headName: null,
    headDesignation: null,
    officialEmail: null,
    contactNumber: null,
    isActive: false,
    createdAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z",
  },
];

describe("Master Data Offices read path", () => {
  beforeEach(async () => {
    await prisma.office.deleteMany();
  });

  it("enables Offices while keeping the other unbuilt sections disabled", () => {
    expect(masterDataTabs).toEqual([
      { id: "units", label: "Units", disabled: false },
      { id: "categories", label: "Categories", disabled: true },
      { id: "offices", label: "Offices", disabled: false },
      { id: "vendors", label: "Vendors", disabled: true },
    ]);
    expect(getMasterDataListState("tab=offices&search=  mayor  &page=2")).toEqual(
      {
        tab: "offices",
        search: "  mayor  ",
        page: 2,
      },
    );
  });

  it("matches trimmed, case-insensitive Office name and abbreviation searches", () => {
    expect(filterOffices(officeRows, { search: "  mayor  " })).toEqual([
      officeRows[0],
    ]);
    expect(filterOffices(officeRows, { search: " mo " })).toEqual([
      officeRows[0],
    ]);
    expect(filterOffices(officeRows, { search: "HEALTH" })).toEqual([
      officeRows[1],
    ]);
    expect(filterOffices(officeRows, { search: "missing" })).toEqual([]);
  });

  it("reports empty, single-result, and ten-row ranges truthfully", () => {
    expect(getOfficeResultsSummary({ start: 0, end: 0, total: 0 })).toBe(
      "No results",
    );
    expect(getOfficeResultsSummary({ start: 1, end: 1, total: 1 })).toBe(
      "Showing 1 result",
    );
    expect(getOfficeResultsSummary({ start: 11, end: 11, total: 11 })).toBe(
      "Showing 11 to 11 of 11 results",
    );
  });

  it("lists active and inactive Offices with only approved public fields", async () => {
    await prisma.office.createMany({
      data: [
        {
          id: "health-office",
          name: "Municipal Health Office",
          normalizedName: "municipal health office",
          normalizedAbbreviation: null,
          isActive: false,
        },
        {
          id: "mayors-office",
          name: "Mayor's Office",
          abbreviation: "MO",
          normalizedName: "mayor's office",
          normalizedAbbreviation: "mo",
          headName: "Alex Santos",
          headDesignation: "Department Head",
          officialEmail: "mayor@example.test",
          contactNumber: "0917 000 0001",
        },
      ],
    });

    await expect(listOffices()).resolves.toMatchObject([
      {
        id: "mayors-office",
        name: "Mayor's Office",
        abbreviation: "MO",
        headName: "Alex Santos",
        headDesignation: "Department Head",
        officialEmail: "mayor@example.test",
        contactNumber: "0917 000 0001",
        isActive: true,
      },
      {
        id: "health-office",
        name: "Municipal Health Office",
        abbreviation: null,
        headName: null,
        headDesignation: null,
        officialEmail: null,
        contactNumber: null,
        isActive: false,
      },
    ]);

    const offices = await listOffices();
    expect(offices[0]).not.toHaveProperty("normalizedName");
    expect(offices[0]).not.toHaveProperty("normalizedAbbreviation");
    expect(offices[0]?.createdAt).toEqual(expect.any(String));
    expect(offices[0]?.updatedAt).toEqual(expect.any(String));
  });
});

describe("Master Data Office persistence contract", () => {
  beforeEach(async () => {
    await prisma.office.deleteMany();
  });

  it("has the approved columns, normalized identity indexes, active default, and timestamps", async () => {
    const columns = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM pragma_table_info('office') ORDER BY cid
    `;
    const table = await prisma.$queryRaw<Array<{ sql: string }>>`
      SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'office'
    `;
    const indexes = await prisma.$queryRaw<Array<{ name: string; sql: string }>>`
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'index' AND name IN ('office_normalizedName_key', 'office_normalizedAbbreviation_key')
      ORDER BY name
    `;

    expect(columns.map(({ name }) => name)).toEqual([
      "id",
      "name",
      "abbreviation",
      "headName",
      "headDesignation",
      "officialEmail",
      "contactNumber",
      "isActive",
      "createdAt",
      "updatedAt",
      "normalizedName",
      "normalizedAbbreviation",
    ]);
    expect(table[0]?.sql).toContain('"isActive" BOOLEAN NOT NULL DEFAULT true');
    expect(indexes).toHaveLength(2);
    expect(indexes.map(({ name }) => name)).toEqual([
      "office_normalizedAbbreviation_key",
      "office_normalizedName_key",
    ]);
  });

  it("defaults new Office records to active and manages both timestamps", async () => {
    const office = await prisma.office.create({
      data: {
        id: "new-office",
        name: "New Office",
        normalizedName: "new office",
        normalizedAbbreviation: null,
      },
    });

    expect(office).toMatchObject({
      id: "new-office",
      name: "New Office",
      abbreviation: null,
      headName: null,
      headDesignation: null,
      officialEmail: null,
      contactNumber: null,
      isActive: true,
    });
    expect(office.createdAt).toBeInstanceOf(Date);
    expect(office.updatedAt).toBeInstanceOf(Date);
  });
});
