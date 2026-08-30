import { z } from "zod";

const minPasswordLength = 8;
const maxPasswordLength = 128;

const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_.]+$/)
  .transform((username) => username.toLowerCase());

export const createStaffAccountSchema = z.object({
  username: usernameSchema,
  password: z.string().min(minPasswordLength).max(maxPasswordLength),
  name: z.string().trim().min(1).max(100).optional(),
});

export const resetAccountPasswordSchema = z.object({
  username: usernameSchema,
  password: z.string().min(minPasswordLength).max(maxPasswordLength),
});

export const disableStaffAccountSchema = z.object({
  username: usernameSchema,
});

export type CreateStaffAccountInput = z.infer<typeof createStaffAccountSchema>;
export type ResetAccountPasswordInput = z.infer<
  typeof resetAccountPasswordSchema
>;
export type DisableStaffAccountInput = z.infer<
  typeof disableStaffAccountSchema
>;
