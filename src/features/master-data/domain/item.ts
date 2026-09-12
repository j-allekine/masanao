export const ITEM_NAME_MAX_LENGTH = 100;
export const ITEM_NOTE_MAX_LENGTH = 500;

/**
 * Item names are displayed as entered after outer whitespace is removed and
 * repeated whitespace is made readable. The normalized key is internal and
 * provides case-insensitive uniqueness.
 */
export function normalizeItemDisplayValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeItemKey(value: string) {
  return normalizeItemDisplayValue(value).toLowerCase();
}

export function normalizeItemNote(value: string) {
  return value.trim();
}
