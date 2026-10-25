import { z } from "zod";

export const purchaseOrderSummaryIdsSchema = z.array(z.string().min(1).max(256)).max(10);
