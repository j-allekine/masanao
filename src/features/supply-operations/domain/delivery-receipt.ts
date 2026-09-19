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
