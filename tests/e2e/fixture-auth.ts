import { setTimeout } from "node:timers/promises";
import type { APIRequestContext } from "@playwright/test";

const signInPath = "/api/auth/sign-in/username";

export async function postFixtureSignIn(
  request: APIRequestContext,
  options: Parameters<APIRequestContext["post"]>[1],
) {
  const response = await request.post(signInPath, options);
  if (response.status() !== 429) return response;

  // Keep production rate limits active. Fixture sign-ins on the shared
  // loopback address can retry after the window reported by the server.
  const retryAfter = Number(response.headers()["x-retry-after"]);
  if (!Number.isInteger(retryAfter) || retryAfter < 1 || retryAfter > 15) return response;
  await response.dispose();
  await setTimeout(retryAfter * 1_000);
  return request.post(signInPath, options);
}
