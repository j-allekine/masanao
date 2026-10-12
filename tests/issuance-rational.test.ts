import { describe, expect, it } from "vitest";
import { addRational, decimalRational, displayRational, finiteDecimal, isWholeRational, rational, recipeContribution, roundRational } from "@/features/issuance/domain/rational";
describe("Exact issuance arithmetic", () => {
  it("preserves arbitrary exact decimals and snapshotted conversion factors", () => {
    expect(finiteDecimal(recipeContribution("1250.123456789", 200, 100, "0.001"))).toBe("2.500246913578");
    expect(finiteDecimal(decimalRational("0.000000000000000000000001"))).toBe("0.000000000000000000000001");
  });
  it("marks repeating contributions approximate without rounding their calculation", () => {
    const value = recipeContribution("1", 1, 3);
    expect(value).toEqual(rational(BigInt(1), BigInt(3))); expect(displayRational(value)).toEqual({ quantity: "0.333333", approximate: true });
    expect(finiteDecimal(addRational(addRational(value, value), value))).toBe("1");
  });
  it("combines fractional quantities before whole detection", () => {
    const combined = addRational(decimalRational("12.5"), decimalRational("12.5"));
    expect(isWholeRational(combined)).toBe(true); expect(finiteDecimal(combined)).toBe("25");
    expect(isWholeRational(recipeContribution("0.5", 100, 100, "30"))).toBe(true);
  });
  it("rounds halfway away from zero only when requested", () => {
    expect(roundRational(decimalRational("0.0000005"))).toBe("0.000001");
    expect(roundRational(rational(-BigInt(1), BigInt(2000000)))).toBe("-0.000001");
    expect(roundRational(decimalRational("0.00000049"))).toBe("0");
    expect(finiteDecimal(decimalRational("0.00000049"))).toBe("0.00000049");
    expect(roundRational(decimalRational("100"))).toBe("100");
  });
});

