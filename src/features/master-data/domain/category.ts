export const CATEGORY_NAME_MAX_LENGTH = 100;
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 500;

/**
 * Category display values trim only leading and trailing whitespace. Meaningful
 * internal whitespace remains part of the saved label.
 *
 * Category keys use the locale-independent ECMAScript String#toLowerCase
 * mapping after trimming. This gives the server and SQLite the same documented
 * Unicode case-folding input without applying a user or machine locale. The
 * resulting key is internal and is protected by a unique SQLite index.
 */
export function normalizeCategoryDisplayValue(value: string) {
  return value.trim();
}

export function normalizeCategoryKey(value: string) {
  return normalizeCategoryDisplayValue(value).toLowerCase();
}
