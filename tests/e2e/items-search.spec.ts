import { expect, test, type Page } from "@playwright/test";

const staffPassword = "correct-horse-battery-staple";

async function signIn(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: {
      username: "kitchen.staff",
      password: staffPassword,
    },
    headers: {
      origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3019",
    },
  });

  expect(response.status()).toBe(200);
}

test("keeps every character when search is typed slower than the debounce", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/items");

  const search = page.getByLabel("Search Items");
  await expect(search).toBeVisible();
  await search.click();
  await page.keyboard.type("golden", { delay: 350 });

  await expect(search).toHaveValue("golden");
  await expect(page).toHaveURL(/items\?itemsSearch=golden$/);
});
