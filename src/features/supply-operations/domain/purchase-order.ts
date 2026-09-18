export const PURCHASE_ORDER_NUMBER_MAX_LENGTH = 100;
export const PURCHASE_ORDER_REFERENCE_NUMBER_MAX_LENGTH = 100;
export const PURCHASE_ORDER_NOTE_MAX_LENGTH = 500;

export function normalizePurchaseOrderNo(value: string) {
  return value.trim();
}

export function normalizePurchaseOrderNoKey(value: string) {
  return normalizePurchaseOrderNo(value).toLowerCase();
}

export function normalizePurchaseOrderOptionalValue(value: string) {
  return value.trim();
}
