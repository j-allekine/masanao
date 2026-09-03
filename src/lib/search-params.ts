export type SearchParamValue = string | string[] | undefined;

export function serializeSearchParams(
  searchParams: Record<string, SearchParamValue>,
) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }

  return query.toString();
}
