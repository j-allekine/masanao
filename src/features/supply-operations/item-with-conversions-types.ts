import type { ItemListItem } from "./types";

export type ItemWithConversionsResult =
  | { ok: true; item: ItemListItem }
  | { ok: false; kind: "forbidden" | "validation" | "duplicate" | "busy" | "server"; error: string; fields: Record<string, string[]> };
