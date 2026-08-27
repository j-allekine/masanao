import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const signInEndpoint = "**/api/auth/sign-in/username";
const protectedEndpoint = "**/api/operations";

function loginMain(page: Page) {
  return page.getByRole("main", { name: "Masanao staff sign-in", exact: true });
}

function loginForm(page: Page) {
  return page.getByRole("form", { name: "Masanao staff sign in", exact: true });
}

async function openLogin(page: Page) {
  await page.goto("/");
  await expect(loginMain(page)).toBeVisible();
  await expect(loginForm(page)).toBeVisible();
}

test.describe("production login interactions", () => {
  test("toggles password visibility without changing the entered value", async ({ page }) => {
    await openLogin(page);

    const password = page.getByLabel("Password", { exact: true });
    const enteredPassword = "correct-horse-battery-staple";

    await password.fill(enteredPassword);
    await expect(password).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show password", exact: true }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue(enteredPassword);

    await page.getByRole("button", { name: "Hide password", exact: true }).click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveValue(enteredPassword);
  });

  test("submits trimmed username and password and shows success status", async ({ page }) => {
    await page.route(signInEndpoint, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        json: {
          redirect: false,
          token: "test-session-token",
          url: null,
          user: { id: "test-user", username: "kitchen.staff" },
        },
      });
    });
    await page.route(protectedEndpoint, async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        json: { authenticated: true },
      });
    });

    await openLogin(page);

    const username = page.getByLabel("Username", { exact: true });
    const password = page.getByLabel("Password", { exact: true });
    const requestPromise = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/auth/sign-in/username",
    );
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/auth/sign-in/username",
    );
    const protectedResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/operations",
    );

    await username.fill("  kitchen.staff  ");
    await password.fill("correct-horse-battery-staple");
    await password.press("Enter");

    const [request, response, protectedResponse] = await Promise.all([
      requestPromise,
      responsePromise,
      protectedResponsePromise,
    ]);
    expect(response.status()).toBe(200);
    expect(protectedResponse.status()).toBe(200);
    expect(request.postDataJSON()).toMatchObject({
      username: "kitchen.staff",
      password: "correct-horse-battery-staple",
    });
    await expect(page.getByRole("status")).toBeVisible();
  });

  test("shows a generic alert for an unauthorized sign-in", async ({ page }) => {
    await page.route(signInEndpoint, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 401,
        json: { message: "Invalid username or password." },
      });
    });

    await openLogin(page);

    const usernameValue = "unknown.staff";
    await page.getByLabel("Username", { exact: true }).fill(usernameValue);
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByLabel("Password", { exact: true }).press("Enter");

    const alert = loginForm(page).getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText(/\S+/);
    await expect(alert).not.toContainText(usernameValue);
    await expect(alert).not.toHaveText(
      /(?:username|user).*(?:does not exist|not found|unknown|unregistered|not registered|not assigned)|(?:does not exist|not found|unknown|unregistered|not registered|not assigned).*(?:username|user)/i,
    );
  });

  test("keeps the welcome area and sign-in form visible on desktop and mobile", async ({ page }) => {
    const viewports = [
      { name: "desktop", width: 1280, height: 800 },
      { name: "mobile", width: 390, height: 844 },
    ] as const;

    for (const viewport of viewports) {
      await test.step(viewport.name, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openLogin(page);
        await expect(page.getByRole("complementary")).toBeVisible();
        await expect(loginForm(page)).toBeVisible();

        const layout = await loginMain(page).evaluate((main) => {
          const welcome = main.querySelector<HTMLElement>("[aria-labelledby='welcome-title']");
          const signIn = main.querySelector<HTMLElement>("[aria-labelledby='sign-in-title']");

          if (!welcome || !signIn) {
            throw new Error("Expected both login layout regions");
          }

          const welcomeBounds = welcome.getBoundingClientRect();
          const signInBounds = signIn.getBoundingClientRect();

          return {
            display: getComputedStyle(main).display,
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            welcomeBottom: welcomeBounds.bottom,
            welcomeRight: welcomeBounds.right,
            signInLeft: signInBounds.left,
            signInTop: signInBounds.top,
          };
        });

        expect(layout.documentWidth).toBe(layout.viewportWidth);

        if (viewport.name === "desktop") {
          expect(layout.display).toBe("grid");
          expect(layout.signInLeft).toBeGreaterThanOrEqual(layout.welcomeRight - 1);
        } else {
          expect(layout.display).toBe("block");
          expect(layout.signInTop).toBeGreaterThanOrEqual(layout.welcomeBottom - 1);
        }
      });
    }
  });
});
