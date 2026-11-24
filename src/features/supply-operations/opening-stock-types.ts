import type { ItemListItem } from "./types";

export type OpeningStockLineInput = {
  id: string;
  itemId: string;
  quantity: string;
  selectedUnitId: string;
  conversionId: string | null;
  openingUnitCost: string;
  zeroCostReason: string;
};
export type OpeningStockLine = OpeningStockLineInput & {
  position: number;
  itemName: string;
  selectedUnitName: string;
  selectedUnitAbbreviation: string;
  baseUnitId: string;
  baseUnitName: string;
  baseUnitAbbreviation: string;
  conversionFactor: string;
  calculatedBaseUnitQuantity: string | null;
  lineAmount: string | null;
};
export type OpeningStockWorkspace = {
  corrections?: import("./opening-stock-correction-types").OpeningStockCorrection[];
  sources?: import("./opening-stock-correction-types").OpeningStockSourceSummary[];
  reference?: string;
  postedAt?: string | null;
  postedByName?: string | null;
  status: "not-started" | "draft" | "posted";
  revision: number;
  attemptId: string | null;
  countDate: string;
  note: string;
  canManage: boolean;
  eligible: boolean;
  lines: OpeningStockLine[];
  items: ItemListItem[];
};
export type OpeningStockResult<T> = { ok: true; value: T } | {
  ok: false;
  kind: "forbidden" | "validation" | "conflict" | "history" | "reference" | "busy" | "server";
  error: string;
  fields?: Record<string, string>;
};
export type OpeningStockSaveInput = {
  attemptId: string;
  revision: number;
  countDate: string;
  note: string;
  lines: OpeningStockLineInput[];
};
