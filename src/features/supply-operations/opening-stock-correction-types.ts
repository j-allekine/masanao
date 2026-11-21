import type { OpeningStockLine, OpeningStockLineInput } from "./opening-stock-types";
export type OpeningStockCorrectionLine = OpeningStockLine & { beforeQuantity: string; beforeValueCentavos: string; afterQuantity: string | null; afterValueCentavos: string | null };
export type OpeningStockCorrection = { id: string; openingStockId: string; reference: string; kind: "add-omitted"; status: "draft" | "posted"; revision: number; reason: string; note: string; createdByName: string; postedByName: string | null; postedAt: string | null; lines: OpeningStockCorrectionLine[] };
export type OpeningStockSourceSummary = { id: string; itemId: string; itemName: string; reference: string; position: number; quantity: string; remainingQuantity: string; remainingValueCentavos: string; baseUnitAbbreviation: string; correctionId: string | null };
export type OpeningStockCorrectionSaveInput = { id: string; revision: number; reason: string; note: string; lines: OpeningStockLineInput[] };
