import "server-only";
import type { CurrentActor } from "@/server/auth";
import { listInventoryRecords } from "../db/inventory";

export function listInventory(actor: CurrentActor | null | undefined) {
  return listInventoryRecords(actor);
}
