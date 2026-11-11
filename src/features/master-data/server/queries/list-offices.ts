import "server-only";

import { listActiveOfficeOptionRecords, listOfficeRecords } from "../db/offices";

export async function listOffices() {
  return listOfficeRecords();
}

export async function listActiveOfficeOptions() {
  return listActiveOfficeOptionRecords();
}
