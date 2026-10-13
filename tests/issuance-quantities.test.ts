import { describe, expect, it } from "vitest";
import { calculateIssuanceReview, confirmationIsAdjustment, issuanceDemandSignatures, isValidIssuanceFinalQuantity } from "@/features/issuance/domain/quantities";
import type { IssuanceDraft, IssuanceIngredient, IssuanceQuantityPolicy } from "@/features/issuance/types";
const ingredient: IssuanceIngredient = { id: "ingredient", itemId: "eggs", itemName: "Eggs", enteredQuantity: "25", conversionFactor: "1", selectedUnitId: "piece", selectedUnitName: "Piece", selectedUnitAbbreviation: "pc", baseUnitId: "piece", baseUnitName: "Piece", baseUnitAbbreviation: "pc" };
function draft(quantities: string[], baselinePax = 2): IssuanceDraft {
  return { id: "draft", revision: 1, status: "draft", mealPax: 1, stockItems: [], recipes: quantities.map((enteredQuantity, index) => ({ id: `recipe-${index}`, recipeId: `master-${index}`, recipeName: `Food ${index}`, baselinePax, sourceRevision: "revision", targetMode: "meal", targetPax: 1, ingredients: [{ ...ingredient, enteredQuantity }] })) };
}
function review(value: IssuanceDraft, policy: IssuanceQuantityPolicy = "whole-only", availableQuantity = "100") {
  return calculateIssuanceReview(value, [{ itemId: "eggs", policy, availableQuantity }]);
}
describe("Combined issuance quantities", () => {
  it("validates exact whole demand after combining Recipes and converted direct stock", () => {
    expect(review(draft(["25", "25"])).review[0]).toMatchObject({ finalQuantity: "25", warning: null, calculatedNumerator: "25", calculatedDenominator: "1" });
    const value = draft(["25"]);
    value.stockItems = [{ ...ingredient, id: "stock", conversionId: "tray", enteredQuantity: "0.5", conversionFactor: "25" }];
    expect(review(value).review[0]).toMatchObject({ finalQuantity: "25", warning: null });
  });
  it("aggregates rational thirds before the single rounding step", () => {
    expect(review(draft(["1", "1", "1"], 3), "allow-decimals").review[0]).toMatchObject({ finalQuantity: "1", calculatedApproximate: false });
    expect(review(draft(["1"], 3), "allow-decimals").review[0]).toMatchObject({ finalQuantity: "0.333333", calculatedNumerator: "1", calculatedDenominator: "3", calculatedApproximate: true });
  });
  it("rounds exact ties away and warns about tiny positive demand rounded to zero", () => {
    expect(review(draft(["0.000001"]), "allow-decimals").review[0].finalQuantity).toBe("0.000001");
    expect(review(draft(["0.0000009"]), "allow-decimals").review[0]).toMatchObject({ finalQuantity: "0", warning: "rounded-zero" });
    const value = draft(["0.0000009"]);
    value.itemTotals = [{ itemId: "eggs", calculatedNumerator: "9", calculatedDenominator: "20000000", finalQuantity: "0.00000000001", adjusted: true }];
    expect(review(value, "allow-decimals").review[0]).toMatchObject({ finalQuantity: "0.00000000001", warning: null });
  });
  it("retains direct-only precision and exact accepted manual totals", () => {
    const value = draft([]);
    value.stockItems = [{ ...ingredient, id: "stock", conversionId: null, enteredQuantity: "1.123456789123456789", conversionFactor: "0.00000001" }];
    expect(review(value, "allow-decimals").review[0].finalQuantity).toBe("0.00000001123456789123456789");
    value.itemTotals = [{ itemId: "eggs", calculatedNumerator: "0", calculatedDenominator: "1", finalQuantity: "9.987654321987654321", adjusted: true }];
    expect(review(value, "allow-decimals", "9.98765432198765432").review[0]).toMatchObject({ finalQuantity: "9.987654321987654321", shortage: true });
  });
  it("checks exact unadjusted whole demand before rounding and confirmed whole demand after adjustment", () => {
    const value = draft(["37"]);
    expect(review(value).review[0]).toMatchObject({ finalQuantity: "18.5", warning: "fractional" });
    value.itemTotals = [{ itemId: "eggs", calculatedNumerator: "37", calculatedDenominator: "2", finalQuantity: "19", adjusted: true }];
    expect(review(value, "whole-only", "18.99").review[0]).toMatchObject({ finalQuantity: "19", warning: null, shortage: true });
    const tinyFraction = review(draft(["36.0000002"])).review[0];
    expect(tinyFraction).toMatchObject({ finalQuantity: "18.0000001", warning: "fractional" });
    expect(confirmationIsAdjustment(tinyFraction, "18")).toBe(true);
    expect(confirmationIsAdjustment(review(draft(["36.0000002"]), "allow-decimals").review[0], "18")).toBe(false);
    const repeatingNearWhole = review(draft(["54.0000001"], 3)).review[0];
    expect(repeatingNearWhole).toMatchObject({ automaticQuantity: "18", warning: "fractional" });
    expect(confirmationIsAdjustment(repeatingNearWhole, "18")).toBe(true);
  });
  it("marks missing pax pending and never claims complete availability", () => {
    const value = draft(["37"]); value.mealPax = null; value.recipes[0].targetPax = null;
    expect(review(value, "whole-only", "0")).toMatchObject({ reviewPending: true, review: [{ shortage: false, warning: null }] });
  });
  it("tracks changed source demand even when two changes cancel in the aggregate", () => {
    const value = draft(["25", "25"]); const before = issuanceDemandSignatures(value).get("eggs");
    value.recipes[0].targetPax = 2; value.recipes[1].targetPax = null;
    expect(issuanceDemandSignatures(value).get("eggs")).not.toBe(before);
  });
});


describe("Final issuance quantity policy", () => {
  it("accepts positive whole decimals without losing large-number precision", () => {
    expect(isValidIssuanceFinalQuantity("9007199254740993.000", "whole-only")).toBe(true);
    expect(isValidIssuanceFinalQuantity("9007199254740993.000000000000000001", "whole-only")).toBe(false);
    expect(isValidIssuanceFinalQuantity("0.000000000000000001", "allow-decimals")).toBe(true);
  });
  it.each(["0", "0.000", "-1", "+1", "1e3", " 1", "1.", ".1", ""])("rejects invalid final quantity %s for either policy", (quantity) => {
    expect(isValidIssuanceFinalQuantity(quantity, "whole-only")).toBe(false);
    expect(isValidIssuanceFinalQuantity(quantity, "allow-decimals")).toBe(false);
  });
});
