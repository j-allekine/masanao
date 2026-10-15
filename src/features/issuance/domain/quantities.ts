import type { IssuanceDraft, IssuanceQuantityPolicy, IssuanceReviewItem, IssuanceReviewReference } from "../types";
import { addRational, compareRational, decimalRational, displayRational, finiteDecimal, isWholeRational, multiplyRational, rational, recipeContribution, roundRational } from "./rational";
import type { Rational } from "./rational";
import { isPositiveExactDecimal } from "@/features/supply-operations/domain/delivery-receipt";

/** Validate accepted final quantities without rounding or coercing their precision. */
export function isValidIssuanceFinalQuantity(quantity: string, policy: IssuanceQuantityPolicy): boolean {
  return isPositiveExactDecimal(quantity) && (policy !== "whole-only" || isWholeRational(decimalRational(quantity)));
}

/** A policy-invalid automatic quantity cannot make an explicit confirmation redundant. */
export function confirmationIsAdjustment(row: Pick<IssuanceReviewItem, "calculatedNumerator" | "calculatedDenominator" | "automaticQuantity" | "policy">, finalQuantity: string): boolean {
  const exact = rational(BigInt(row.calculatedNumerator), BigInt(row.calculatedDenominator));
  const automatic = decimalRational(row.automaticQuantity);
  const validAutomatic = automatic.numerator > BigInt(0) && (row.policy !== "whole-only" || isWholeRational(exact));
  return !validAutomatic || compareRational(decimalRational(finalQuantity), automatic) !== 0;
}

/** Source entries, including pending targets, make the adjustment lock independent of total equality. */
export function issuanceDemandSignatures(draft: IssuanceDraft): Map<string, string> {
  const entries = new Map<string, string[]>();
  const add = (itemId: string, entry: unknown) => entries.set(itemId, [...(entries.get(itemId) ?? []), JSON.stringify(entry)]);
  for (const recipe of draft.recipes) for (const ingredient of recipe.ingredients) {
    add(ingredient.itemId, ["recipe", recipe.id, ingredient.id, recipe.targetPax, recipe.baselinePax, ingredient.enteredQuantity, ingredient.conversionFactor, ingredient.baseUnitId]);
  }
  for (const stock of draft.stockItems) add(stock.itemId, ["stock", stock.id, stock.enteredQuantity, stock.conversionFactor, stock.selectedUnitId, stock.baseUnitId]);
  return new Map([...entries].map(([itemId, contributions]) => [itemId, JSON.stringify(contributions.sort())]));
}

export function calculateIssuanceReview(draft: IssuanceDraft, references: IssuanceReviewReference[]): { review: IssuanceReviewItem[]; reviewPending: boolean } {
  const refs = new Map(references.map((reference) => [reference.itemId, reference]));
  const totals = new Map<string, { value: Rational; recipe: boolean; pending: boolean; itemName: string; baseUnitId: string; baseUnitName: string; baseUnitAbbreviation: string }>();
  const add = (source: IssuanceDraft["stockItems"][number] | IssuanceDraft["recipes"][number]["ingredients"][number], value: Rational, recipe: boolean, pending = false) => {
    const previous = totals.get(source.itemId);
    totals.set(source.itemId, { itemName: source.itemName, baseUnitId: source.baseUnitId, baseUnitName: source.baseUnitName, baseUnitAbbreviation: source.baseUnitAbbreviation, value: addRational(previous?.value ?? rational(BigInt(0)), value), recipe: recipe || Boolean(previous?.recipe), pending: pending || Boolean(previous?.pending) });
  };
  for (const recipe of draft.recipes) for (const ingredient of recipe.ingredients) add(ingredient, recipe.targetPax ? recipeContribution(ingredient.enteredQuantity, recipe.targetPax, recipe.baselinePax, ingredient.conversionFactor) : rational(BigInt(0)), true, !recipe.targetPax);
  for (const stock of draft.stockItems) add(stock, multiplyRational(decimalRational(stock.enteredQuantity), decimalRational(stock.conversionFactor)), false);
  const adjustments = new Map((draft.itemTotals ?? []).filter((total) => total.adjusted).map((total) => [total.itemId, total.finalQuantity]));
  const reviewPending = !draft.mealPax || [...totals.values()].some((total) => total.pending);
  const review = [...totals].map(([itemId, total]): IssuanceReviewItem => {
    const reference = refs.get(itemId);
    const calculated = displayRational(total.value);
    const policy = reference?.policy ?? "allow-decimals";
    const automaticQuantity = total.recipe && policy === "allow-decimals" ? roundRational(total.value) : finiteDecimal(total.value) ?? roundRational(total.value);
    const finalQuantity = adjustments.get(itemId) ?? automaticQuantity;
    const final = decimalRational(finalQuantity);
    const warning = !total.pending && (final.numerator === BigInt(0) && total.value.numerator > BigInt(0)) ? "rounded-zero" : !total.pending && policy === "whole-only" && !(adjustments.has(itemId) ? isWholeRational(final) : isWholeRational(total.value)) ? "fractional" : null;
    const availableQuantity = reference?.availableQuantity ?? "0";
    // Negative balances are possible only through existing ledger evidence; parse their sign exactly.
    const available = availableQuantity.startsWith("-") ? rational(-decimalRational(availableQuantity.slice(1)).numerator, decimalRational(availableQuantity.slice(1)).denominator) : decimalRational(availableQuantity);
    return { itemId, itemName: total.itemName, baseUnitId: total.baseUnitId, baseUnitName: total.baseUnitName, baseUnitAbbreviation: total.baseUnitAbbreviation, calculatedNumerator: total.value.numerator.toString(), calculatedDenominator: total.value.denominator.toString(), calculatedQuantity: calculated.quantity, calculatedApproximate: calculated.approximate, automaticQuantity, finalQuantity, adjusted: adjustments.has(itemId), policy, warning, availableQuantity, shortage: !reviewPending && compareRational(final, available) > 0 };
  });
  return { review: review.sort((a, b) => a.itemName.localeCompare(b.itemName)), reviewPending };
}
