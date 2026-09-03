import "server-only";

import { listUnitRecords } from "../db/units";

export async function listUnits() {
  return listUnitRecords();
}
