import { addRational, compareRational, decimalRational, divideRational, multiplyRational, rational } from "@/features/issuance/domain/rational";

/** Allocate centavos cumulatively so a fully consumed receipt is never overcosted. */
export function allocatedSupplyCost(amount: string | null, received: string, before: string, quantity: string): string | null {
  if (amount === null) return null;
  try {
    const price = decimalRational(amount);
    const total = decimalRational(received);
    const prior = decimalRational(before);
    const issued = decimalRational(quantity);
    const after = addRational(prior, issued);
    if (total.numerator <= BigInt(0) || issued.numerator <= BigInt(0) || compareRational(after, total) > 0) return null;
    const rate = divideRational(multiplyRational(price, rational(BigInt(100))), total);
    const round = (value: ReturnType<typeof rational>) => (value.numerator * BigInt(2) + value.denominator) / (value.denominator * BigInt(2));
    return (round(multiplyRational(after, rate)) - round(multiplyRational(prior, rate))).toString();
  } catch { return null; }
}

export function budgetComparison(budget: string | null, cost: string | null) {
  if (budget === null || cost === null || !/^\d+$/.test(budget) || !/^\d+$/.test(cost)) return { variance: null, used: null };
  const planned = BigInt(budget);
  const spent = BigInt(cost);
  // Round percentage to one decimal using integer arithmetic; zero has no ratio.
  const tenths = planned > BigInt(0) ? (spent * BigInt(1000) * BigInt(2) + planned) / (planned * BigInt(2)) : null;
  return { variance: (planned - spent).toString(), used: tenths === null ? null : `${tenths / BigInt(10)}.${tenths % BigInt(10)}%` };
}

export function formatBudgetMoney(centavos: string, signed = false) {
  const value = BigInt(centavos);
  const magnitude = value < BigInt(0) ? -value : value;
  const sign = value < BigInt(0) ? "−" : signed && value > BigInt(0) ? "+" : "";
  return `${sign}₱${(magnitude / BigInt(100)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${(magnitude % BigInt(100)).toString().padStart(2, "0")}`;
}
