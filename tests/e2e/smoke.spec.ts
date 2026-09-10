import { expect, test } from "@playwright/test";

test("loads the launch experience without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const viewport = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 1);
});

test("opens the public shop", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("opens the admin sign-in surface", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Zama admin" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("redirects a legacy hash route to its real path", async ({ page }) => {
  await page.goto("/#/shop");
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
