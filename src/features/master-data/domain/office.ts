export const OFFICE_NAME_MAX_LENGTH = 200;
export const OFFICE_ABBREVIATION_MAX_LENGTH = 20;
export const OFFICE_HEAD_NAME_MAX_LENGTH = 200;
export const OFFICE_HEAD_DESIGNATION_MAX_LENGTH = 150;
export const OFFICE_OFFICIAL_EMAIL_MAX_LENGTH = 254;
export const OFFICE_CONTACT_NUMBER_MAX_LENGTH = 100;

export function normalizeOfficeDisplayValue(value: string) {
  return value.trim();
}

export function normalizeOfficeKey(value: string) {
  return normalizeOfficeDisplayValue(value).toLowerCase();
}
