import { compareRational, decimalRational } from "@/features/issuance/domain/rational";

export type StockStatus = "out-of-stock" | "reorder-now" | "good" | "review-required";
export type StockBalance =
  | { kind: "valid"; quantity: string }
  | { kind: "invalid"; error: string };

export class InvalidStockEvidenceError extends Error {}

export const stockStatusLabels: Record<StockStatus, string> = {
  "out-of-stock": "Out of stock",
  "reorder-now": "Reorder now",
  good: "Good",
  "review-required": "Review required",
};

export function inventoryStockStatus(balance: StockBalance, reorderLevel: string): StockStatus {
  if (balance.kind === "invalid") return "review-required";
  try {
    const quantity = decimalRational(balance.quantity);
    const level = decimalRational(reorderLevel);
    if (level.numerator <= BigInt(0)) return "review-required";
    if (quantity.numerator === BigInt(0)) return "out-of-stock";
    return compareRational(quantity, level) <= 0 ? "reorder-now" : "good";
  } catch {
    return "review-required";
  }
}
