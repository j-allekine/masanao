export const VENDOR_NAME_MAX_LENGTH = 200;
export const VENDOR_CONTACT_PERSON_MAX_LENGTH = 150;
export const VENDOR_CONTACT_NUMBER_MAX_LENGTH = 50;
export const VENDOR_EMAIL_MAX_LENGTH = 254;
export const VENDOR_ADDRESS_MAX_LENGTH = 500;

export function normalizeVendorDisplayValue(value: string) {
  return value.trim();
}

export function normalizeVendorKey(value: string) {
  return normalizeVendorDisplayValue(value).toLowerCase();
}
