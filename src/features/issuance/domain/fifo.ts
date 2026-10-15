import { addRational, compareRational, decimalRational, finiteDecimal, rational } from "./rational";

export type FifoReceipt = { id: string; quantity: string; receiptDate: string; postedAt: string; receiptId: string };
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Exact Base Unit quantities; received date first, then stable posting/document identities. */
export function allocateFifo(receipts: FifoReceipt[], requiredQuantity: string): { receiptLineId: string; quantity: string }[] | null {
  let required = decimalRational(requiredQuantity);
  const result = [];
  const ordered = [...receipts].sort((a, b) => compareText(a.receiptDate, b.receiptDate) || compareText(a.postedAt, b.postedAt) || compareText(a.receiptId, b.receiptId) || compareText(a.id, b.id));
  for (const receipt of ordered) {
    if (required.numerator === BigInt(0)) break;
    const available = decimalRational(receipt.quantity);
    if (available.numerator === BigInt(0)) continue;
    const taken = compareRational(available, required) < 0 ? available : required;
    result.push({ receiptLineId: receipt.id, quantity: finiteDecimal(taken)! });
    required = addRational(required, rational(-taken.numerator, taken.denominator));
  }
  return required.numerator === BigInt(0) ? result : null;
}
