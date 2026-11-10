import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const signInEndpoint = "**/api/auth/sign-in/username";
const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const;

function loginMain(page: Page) {
  return page.getByRole("main", { name: "Masanao staff sign-in", exact: true });
}

function loginForm(page: Page) {
  return page.getByRole("form", { name: "Masanao staff sign in", exact: true });
}

async function openLogin(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(loginMain(page)).toBeVisible();
  await expect(loginForm(page)).toBeVisible();
  await expect(loginForm(page)).toHaveAttribute("data-client-ready", "true");
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

  test("submits trimmed username and requests the overview handoff", async ({ page }) => {
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
    const overviewRequestPromise = page.waitForRequest(
      (request) => new URL(request.url()).pathname === "/dashboard",
    );

    await username.fill("  kitchen.staff  ");
    await password.fill("correct-horse-battery-staple");
    await password.press("Enter");

    const [request, response, overviewRequest] = await Promise.all([
      requestPromise,
      responsePromise,
      overviewRequestPromise,
    ]);
    expect(response.status()).toBe(200);
    expect(request.postDataJSON()).toMatchObject({
      username: "kitchen.staff",
      password: "correct-horse-battery-staple",
    });
    expect(new URL(overviewRequest.url()).pathname).toBe("/dashboard");
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
    for (const viewport of viewports) {
      await test.step(viewport.name, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openLogin(page);
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
            welcomeDisplay: getComputedStyle(welcome).display,
          };
        });

        expect(layout.documentWidth).toBe(layout.viewportWidth);

        if (viewport.name === "desktop") {
          expect(layout.display).toBe("grid");
          expect(layout.welcomeDisplay).not.toBe("none");
          expect(layout.signInLeft).toBeGreaterThanOrEqual(layout.welcomeRight - 1);
        } else {
          expect(layout.display).toBe("grid");
          expect(layout.welcomeDisplay).toBe("none");
          expect(layout.signInTop).toBe(0);
        }
      });
    }
  });
});

const signInSurfaces = [
  { path: "/", submit: "Sign in", focusesUsername: true },
  {
    path: "/prototype/login",
    submit: "Sign in",
    focusesUsername: true,
    success: "Local session ready for kitchen.staff.",
  },
  {
    path: "/prototype/login-new",
    submit: "Continue",
    focusesUsername: false,
    success: "Access preview ready.",
  },
] as const;

for (const surface of signInSurfaces) {
  for (const viewport of viewports) {
    test(`required sign-in fields on ${surface.path} at ${viewport.name} width`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (surface.path === "/") await openLogin(page);
      else await page.goto(surface.path);

      const form = page.locator("form").filter({ has: page.getByLabel("Username", { exact: true }) });
      const username = form.getByLabel("Username", { exact: true });
      const password = form.getByLabel("Password", { exact: true });
      const submit = form.getByRole("button", { name: surface.submit, exact: true });

      await expect(form).toHaveAttribute("novalidate", "");
      const fields = await Promise.all(
        [
          { input: username, label: "Username", error: "Enter your username." },
          { input: password, label: "Password", error: "Enter your password." },
        ].map(async (field) => {
          const group = field.input.locator("..");
          const label = form.locator("label").filter({ hasText: field.label });
          const mark = label.getByText("*", { exact: true });
          await expect(field.input).toHaveAccessibleName(field.label);
          await expect(field.input).toHaveAttribute("required", "");
          await expect(mark).toBeVisible();
          await expect(mark).toHaveAttribute("aria-hidden", "true");
          const markColor = await mark.evaluate((element) => getComputedStyle(element).color);
          await expect(label).not.toHaveCSS("color", markColor);
          await expect(group).not.toHaveCSS("border-top-color", markColor);
          const fieldHeight = await group.locator("..").evaluate((element) => element.offsetHeight);
          return { ...field, group, markColor, fieldHeight };
        }),
      );

      await submit.click();

      for (const { input, group, markColor, fieldHeight, error } of fields) {
        await expect(input).toHaveAttribute("aria-invalid", "true");
        await expect(input).toHaveAccessibleDescription(error);
        await expect(group).toHaveCSS("border-top-color", markColor);
        await expect(form.getByText(error, { exact: true })).toHaveCSS("position", "absolute");
        await expect(form.getByText(error, { exact: true })).toHaveCSS("overflow", "hidden");
        await expect.poll(() => group.locator("..").evaluate((element) => element.offsetHeight)).toBe(fieldHeight);
      }

      if (surface.focusesUsername) await expect(username).toBeFocused();
      await username.fill("kitchen.staff");
      await expect(username).not.toHaveAttribute("aria-invalid", "true");
      await expect(password).toHaveAttribute("aria-invalid", "true");
      await password.press("Enter");
      await expect(password).toHaveAccessibleDescription("Enter your password.");
      if (surface.path === "/") await expect(password).toBeFocused();

      await password.fill("test-password");
      await expect(password).not.toHaveAttribute("aria-invalid", "true");
      if ("success" in surface) {
        await password.press("Enter");
        await expect(form.getByRole("status")).toContainText(surface.success);
      }
    });
  }
}
