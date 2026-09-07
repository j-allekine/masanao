import "server-only";

import { listVendorRecords } from "../db/vendors";

export async function listVendors() {
  return listVendorRecords();
}
