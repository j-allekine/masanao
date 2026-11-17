import { compareRational, decimalRational, divideRational, finiteDecimal, roundRational } from "@/features/issuance/domain/rational";

import { formatDisplayNumber } from "@/lib/format-display-number";

const minimumDisplayQuantity = decimalRational("0.001");

export function formatInventoryQuantity(quantity: string, baseUnitsPerUnit?: string) {
  if (!/^\d+(?:\.\d+)?$/.test(quantity)) return "Unavailable";
  const base = decimalRational(quantity);
  return baseUnitsPerUnit ? formatConvertedQuantity(base, baseUnitsPerUnit) : formatDisplayNumber(finiteDecimal(base));
}

export function formatConvertedQuantity(base: ReturnType<typeof decimalRational>, baseUnitsPerUnit?: string) {
  const value = baseUnitsPerUnit ? divideRational(base, decimalRational(baseUnitsPerUnit)) : base;
  if (value.numerator > BigInt(0) && compareRational(value, minimumDisplayQuantity) < 0) return "<0.001";
  const rounded = roundRational(value, 3);
  const approximate = compareRational(value, decimalRational(rounded)) !== 0;
  return `${approximate ? "≈" : ""}${formatDisplayNumber(rounded)}`;
}
