import type { ItemUnitConversionListItem } from "../types";

function compareExactPositiveDecimals(left: string, right: string) {
  const [leftWhole, leftFraction = ""] = left.split(".");
  const [rightWhole, rightFraction = ""] = right.split(".");

  if (leftWhole.length !== rightWhole.length) {
    return leftWhole.length - rightWhole.length;
  }

  const wholeComparison = leftWhole.localeCompare(rightWhole);
  if (wholeComparison !== 0) return wholeComparison;

  const fractionLength = Math.max(leftFraction.length, rightFraction.length);
  return leftFraction
    .padEnd(fractionLength, "0")
    .localeCompare(rightFraction.padEnd(fractionLength, "0"));
}

export function compareItemUnitConversions(
  left: ItemUnitConversionListItem,
  right: ItemUnitConversionListItem,
) {
  const unitComparison = left.alternateUnit.name.localeCompare(
    right.alternateUnit.name,
    undefined,
    { sensitivity: "base" },
  );
  if (unitComparison !== 0) return unitComparison;

  const quantityComparison = compareExactPositiveDecimals(
    left.baseUnitQuantity,
    right.baseUnitQuantity,
  );
  if (quantityComparison !== 0) return quantityComparison;

  return left.id.localeCompare(right.id);
}

export function sortItemUnitConversions(
  conversions: ItemUnitConversionListItem[],
) {
  return conversions.toSorted(compareItemUnitConversions);
}
