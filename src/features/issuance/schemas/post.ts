import { z } from "zod";

export const postSchema = z.object({ revision: z.number().int().positive().max(2147483647) }).strict();
