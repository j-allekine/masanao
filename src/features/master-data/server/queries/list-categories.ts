import "server-only";

import { listCategoryRecords } from "../db/categories";

export async function listCategories() {
  return listCategoryRecords();
}
