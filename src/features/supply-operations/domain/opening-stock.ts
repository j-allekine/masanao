import type { OpeningStockLine } from "../opening-stock-types";
import { decimalRational, finiteDecimal, multiplyRational } from "@/features/issuance/domain/rational";

export function openingStockToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function validOpeningStockDate(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > openingStockToday(now)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function openingStockProduct(quantity: string, factor: string): string | null {
  if (!quantity) return null;
  try { return finiteDecimal(multiplyRational(decimalRational(quantity), decimalRational(factor))); }
  catch { return null; }
}

type OpeningStockUnitSnapshot = Pick<OpeningStockLine, "conversionId" | "selectedUnitId" | "selectedUnitName" | "selectedUnitAbbreviation" | "conversionFactor">;

/** Match save-time semantics: an unchanged selection retains its reviewed snapshot. */
export function openingStockUnitSelection(saved: OpeningStockUnitSnapshot | undefined, selected: OpeningStockUnitSnapshot): OpeningStockUnitSnapshot {
  const unit = saved && saved.selectedUnitId === selected.selectedUnitId && saved.conversionId === selected.conversionId ? saved : selected;
  return { conversionId: unit.conversionId, selectedUnitId: unit.selectedUnitId, selectedUnitName: unit.selectedUnitName, selectedUnitAbbreviation: unit.selectedUnitAbbreviation, conversionFactor: unit.conversionFactor };
}
