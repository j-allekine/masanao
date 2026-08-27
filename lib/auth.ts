import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  USERNAME_ERROR_CODES,
  username,
} from "better-auth/plugins/username";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      disabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
        returned: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { disabled: true },
          });

          if (user?.disabled) {
            throw APIError.from(
              "UNAUTHORIZED",
              USERNAME_ERROR_CODES.INVALID_USERNAME_OR_PASSWORD,
            );
          }
        },
      },
    },
  },
  disabledPaths: [
    "/sign-in/email",
    "/sign-in/social",
    "/sign-up/email",
    "/request-password-reset",
    "/reset-password",
    "/send-verification-email",
    "/verify-email",
    "/change-email",
  ],
  plugins: [
    username({
      displayUsername: false,
      immutableUsername: true,
    }),
  ],
});
