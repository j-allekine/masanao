import { beforeAll, expect, test } from "vitest";
import { prisma } from "@/prisma/client";
import { exportInventory } from "@/features/supply-operations/server";
import { formatInventoryCsv } from "../src/features/supply-operations/domain/inventory-csv";
import type { InventoryListItem } from "../src/features/supply-operations/types";
const actor = { id: "csv-staff", name: "CSV staff", username: "csvstaff" };
beforeAll(async () => {
  await prisma.user.create({ data: { ...actor, email: "csv@test.local", role: "staff" } });
  await prisma.category.create({ data: { id: "csv-cat", name: "Pantry", normalizedName: "pantry" } });
  await prisma.unit.create({ data: { id: "csv-kg", name: "Kilogram", normalizedName: "csv kilogram", abbreviation: "kg", normalizedAbbreviation: "csv-kg" } });
  await prisma.item.createMany({ data: Array.from({ length: 23 }, (_, index) => ({ id: `csv-${index}`, name: `CSV ${String(index).padStart(2,"0")}`, normalizedName: `csv ${String(index).padStart(2,"0")}`, categoryId: "csv-cat", baseUnitId: "csv-kg", reorderLevel: "0.000000000000000001" })) });
});
test("public export authorizes current accounts and exports every combined match before pagination in stable order", async () => {
  const params = new URLSearchParams("q=cSv&category=csv-cat&status=out-of-stock&page=3");
  const result = await exportInventory(actor, params);
  expect(result.ok).toBe(true); if (!result.ok) throw Error(result.error);
  expect(result.csv.split("\r\n")).toHaveLength(25);
  expect(result.csv.indexOf('"CSV 00"')).toBeLessThan(result.csv.indexOf('"CSV 22"'));
  expect(result.csv).toContain('"Kilogram (kg)","0","0.000000000000000001","Out of stock"');
  expect(result.csv).toContain(result.filename.slice(10, -4).replace(/T(\d\d)-(\d\d)-(\d\d)/, "T$1:$2:$3"));
  expect(await exportInventory(null, params)).toMatchObject({ ok: false });
  expect(await exportInventory({ ...actor, id: "unknown" }, params)).toMatchObject({ ok: false });
  await prisma.user.update({ where: { id: actor.id }, data: { role: "viewer" } });
  expect(await exportInventory(actor, params)).toMatchObject({ ok: false });
  await prisma.user.update({ where: { id: actor.id }, data: { role: "admin", disabled: true } });
  expect(await exportInventory(actor, params)).toMatchObject({ ok: false });
  await prisma.user.update({ where: { id: actor.id }, data: { disabled: false } });
  expect(await exportInventory(actor, params)).toMatchObject({ ok: true });
  const empty = await exportInventory(actor, new URLSearchParams("q=missing"));
  if (!empty.ok) throw Error(empty.error);
  expect(empty.csv.split("\r\n")).toHaveLength(2);
});
test("CSV preserves exact quantities, exceptional evidence, newlines and quotes while neutralizing formulas in every field", () => {
  const row: InventoryListItem = { id: "1", name: ' \t=SUM(1,2)\n"quoted"', category: { id: "1", name: "\u0001+1" }, baseUnit: { id: "1", name: "@unit", abbreviation: "kg" }, balance: { kind: "valid", quantity: "9007199254740993.000000000000000001" }, reorderLevel: "0.000000000000000001", stockStatus: "good" };
  const csv = formatInventoryCsv([row], "2026-10-20T00:00:00.000Z");
  expect(csv).toContain('"\' \t=SUM(1,2)\n""quoted"""');
  expect(csv).toContain('"\'\u0001+1"'); expect(csv).toContain('"\'@unit (kg)"');
  expect(csv).toContain('"9007199254740993.000000000000000001"');
  expect(formatInventoryCsv([{ ...row, balance: { kind: "invalid", error: "broken evidence" }, stockStatus: "review-required" }], "now")).toContain('"Unavailable","0.000000000000000001","Review required"');
});


test.each(["=1+1", "+1+1", "-1+1", "@SUM(1,2)", " \t=1+1", "\u0000=1+1", "\u0085=1+1", "\rtext", "\ntext", "\ttext"])("neutralizes spreadsheet formula/control prefix %j", (name) => {
  const row: InventoryListItem = { id: "safe", name, category: { id: "1", name }, baseUnit: { id: "1", name, abbreviation: "unit" }, balance: { kind: "valid", quantity: "0" }, reorderLevel: "1", stockStatus: "out-of-stock" };
  expect(formatInventoryCsv([row], "now")).toContain(`"'${name}"`);
});
