import { expect, test } from "@playwright/test";

test("renders the admin login when not signed in", async ({ page }) => {
  await page.goto("/#/admin");

  await expect(page.getByRole("heading", { name: "Zama admin" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("link", { name: "← Back to site" })).toHaveAttribute("href", "#/");
});

test("admin login rejects a bad sign-in with a visible error", async ({ page }) => {
  await page.route("**/auth/v1/token*", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "invalid_credentials", error_description: "Invalid login credentials" }),
    }),
  );

  await page.goto("/#/admin");

  await page.getByLabel("Email").fill("not-an-admin@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
});
