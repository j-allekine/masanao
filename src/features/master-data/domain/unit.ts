export const UNIT_NAME_MAX_LENGTH = 100;
export const UNIT_ABBREVIATION_MAX_LENGTH = 30;

export function normalizeUnitDisplayValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeUnitKey(value: string) {
  return normalizeUnitDisplayValue(value).toLowerCase();
}
