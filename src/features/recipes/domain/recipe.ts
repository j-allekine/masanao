export const RECIPE_NAME_MAX_LENGTH = 100;
export const RECIPE_PREPARATION_NOTE_MAX_LENGTH = 1_000;

export function normalizeRecipeDisplayValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeRecipeKey(value: string) {
  return normalizeRecipeDisplayValue(value).toLocaleLowerCase();
}

export function normalizeRecipeNote(value: string) {
  return value.trim();
}
