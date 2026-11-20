import "server-only";
import type { CurrentActor } from "@/server/auth";
import { readOpeningStockWorkspaceRecord } from "../db/opening-stock";
export async function getOpeningStockWorkspaceQuery(actor: CurrentActor | null | undefined) {
  return readOpeningStockWorkspaceRecord(actor);
}
