import {
  createStaffAccount,
  disableStaffAccount,
  resetStaffPassword,
} from "@/features/access-management/server";

export const POST = createStaffAccount;
export const PATCH = resetStaffPassword;
export const DELETE = disableStaffAccount;
