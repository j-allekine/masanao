import { redirect } from "next/navigation";

/** Preserve dated bookmarks while Dashboard becomes the canonical destination. */
export default async function LegacyOverviewRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, entry);
  }
  redirect(`/dashboard${query.size ? `?${query}` : ""}`);
}
