import { setTimeout } from "node:timers/promises";
import type { APIRequestContext } from "@playwright/test";

const signInPath = "/api/auth/sign-in/username";

export async function postFixtureSignIn(
  request: APIRequestContext,
  options: Parameters<APIRequestContext["post"]>[1],
) {
  const response = await request.post(signInPath, options);
  if (!await waitForFixtureSignInRetry(response)) return response;
  await response.dispose();
  return request.post(signInPath, options);
}

export async function waitForFixtureSignInRetry(response: Awaited<ReturnType<APIRequestContext["post"]>>) {
  if (response.status() !== 429) return false;
  // Keep production rate limits active. Fixture sign-ins on the shared
  // loopback address can retry after the window reported by the server.
  const retryAfter = Number(response.headers()["x-retry-after"]);
  if (!Number.isInteger(retryAfter) || retryAfter < 1 || retryAfter > 15) return false;
  await setTimeout(retryAfter * 1_000);
  return true;
}
