/** Group a display value without converting exact decimal strings to floating point. */
export function formatDisplayNumber(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value).replace(/^-?\d+(?=\.|$)/, (whole) => whole.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
}

/** Accept plain decimal input or correctly grouped thousands. Validation follows separately. */
export function ungroupDisplayNumber(value: string): string {
  const trimmed = value.trim();
  return /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(trimmed) ? trimmed.replaceAll(",", "") : trimmed;
}
