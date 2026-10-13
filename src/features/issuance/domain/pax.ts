/** A draft can leave pax pending; a supplied count must be a positive integer. */
export function parseIssuancePax(value: string): number | null {
  return /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2147483647
    ? Number(value)
    : null;
}
