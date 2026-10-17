import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

test("record links retain the current typed search while catalog navigation is pending", async ({ page }) => {
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  const id = "e2e-issuance-return-race";
  database.prepare(
    "INSERT INTO activity_design (id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES (?,?,?,2026,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
  ).run(id, "RETURN-RACE", "Return Race Plan");
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });

  try {
    const signIn = await page.request.post("/api/auth/sign-in/username", {
      data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    });
    expect(signIn.status()).toBe(200);
    await page.goto("/activity-designs");
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await page.route(
      (url) => url.pathname === "/activity-designs" && url.searchParams.has("activityDesignsSearch"),
      async (route) => { await pending; await route.continue(); },
    );
    try {
      await page.getByRole("searchbox", { name: "Search Activity Designs", exact: true }).fill("Return Race");
      const record = page.getByRole("link", { name: "Return Race Plan", exact: true });
      await expect(record).toBeVisible();
      const returnQuery = new URLSearchParams({
        planningReturn: "/activity-designs?activityDesignsSearch=Return+Race",
      });
      await expect(record).toHaveAttribute("href", `/activity-designs/${id}?${returnQuery}`);
    } finally {
      release();
    }
    await expect(page).toHaveURL(/activityDesignsSearch=Return\+Race/);
  } finally {
    database.prepare("DELETE FROM activity_design WHERE id=?").run(id);
    database.close();
  }
});
