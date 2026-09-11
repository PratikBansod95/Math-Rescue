import { test, expect } from "@playwright/test";

test("loads Math Rescue shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Math Rescue/i);
  await expect(page.locator("#app")).toBeVisible();
  await expect(
    page.locator("[data-nickname-overlay], [data-menu-screen]").first(),
  ).toBeAttached();
});

test("shows nickname entry on first visit", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-username]")).toBeVisible({
    timeout: 15000,
  });
});
