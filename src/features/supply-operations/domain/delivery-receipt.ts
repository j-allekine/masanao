export const DELIVERY_RECEIPT_NUMBER_MAX_LENGTH = 100;
export const DELIVERY_RECEIPT_NOTE_MAX_LENGTH = 500;

export function normalizeDeliveryReceiptNo(value: string) {
  return value.trim();
}

export function normalizeDeliveryReceiptNoKey(value: string) {
  return normalizeDeliveryReceiptNo(value).toLowerCase();
}

export function normalizeDeliveryReceiptOptionalValue(value: string) {
  return value.trim();
}

export function isPositiveExactDecimal(value: string) {
  return /^\d+(?:\.\d+)?$/.test(value) && /[1-9]/.test(value);
}

export function exactDecimalsEqual(left: string, right: string) {
  const normalize = (value: string) => {
    const [whole, fractional = ""] = value.split(".");
    return `${whole.replace(/^0+(?=\d)/, "") || "0"}.${fractional.replace(/0+$/, "")}`;
  };
  return normalize(left) === normalize(right);
}

export function multiplyExactPositiveDecimals(left: string, right: string) {
  const [leftWhole, leftFraction = ""] = left.split(".");
  const [rightWhole, rightFraction = ""] = right.split(".");
  const scale = leftFraction.length + rightFraction.length;
  const product = BigInt(`${leftWhole}${leftFraction}`) * BigInt(`${rightWhole}${rightFraction}`);
  const digits = product.toString().padStart(scale + 1, "0");

  if (scale === 0) return digits;

  const whole = digits.slice(0, -scale).replace(/^0+(?=\d)/, "") || "0";
  const fraction = digits.slice(-scale).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export function reindexLineErrorsAfterRemoval<T>(
  errors: Record<number, T> | undefined,
  removedIndex: number,
) {
  if (!errors) return undefined;

  const next = Object.entries(errors).reduce<Record<number, T>>((result, [index, error]) => {
    const currentIndex = Number(index);
    if (currentIndex === removedIndex) return result;
    result[currentIndex > removedIndex ? currentIndex - 1 : currentIndex] = error;
    return result;
  }, {});

  return Object.keys(next).length ? next : undefined;
}
