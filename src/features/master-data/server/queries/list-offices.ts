import "server-only";

import { listOfficeRecords } from "../db/offices";

export async function listOffices() {
  return listOfficeRecords();
}
