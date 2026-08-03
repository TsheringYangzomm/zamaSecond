import { expect, test } from "@playwright/test";

test("navigates to the full shop page from the header nav", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Shop", exact: true }).click();

  await expect(page).toHaveURL(/#\/shop$/);
  await expect(page.getByRole("heading", { name: /all products, one basket/i })).toBeVisible();
});

test("opens a product detail page with price and quantity controls", async ({ page }) => {
  await page.goto("/#/shop/meal-kit-box");

  await expect(page.getByRole("heading", { name: "Recipe Meal Kit", level: 1 })).toBeVisible();
  await expect(page.getByText("Nu. 390 per kit")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Recipe Meal Kit to cart" })).toBeVisible();
});

test("adds products across pages and buys them together in the shared basket", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#/shop/meal-kit-box");

  await page.getByRole("button", { name: "Add Recipe Meal Kit to cart" }).click();
  await expect(page.getByRole("button", { name: "Open cart, 1 item" })).toBeVisible();

  await page.getByRole("link", { name: "Browse the full shop" }).first().click();
  await expect(page).toHaveURL(/#\/shop$/);
  await page.getByRole("link", { name: "View Seasonal Vegetable Box details" }).click();
  await expect(page).toHaveURL(/#\/shop\/seasonal-vegetable-box/);

  await page.getByRole("button", { name: "Add Seasonal Vegetable Box to cart" }).click();
  await expect(page.getByRole("button", { name: "Open cart, 2 items" })).toBeVisible();

  await page.getByRole("button", { name: "Open cart, 2 items" }).click();
  const drawer = page.getByRole("dialog", { name: "Market picks" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Recipe Meal Kit")).toBeVisible();
  await expect(drawer.getByText("Seasonal Vegetable Box")).toBeVisible();
  await expect(drawer.getByText(/^Nu\. \d+$/)).toBeVisible();
});

test("filters the shop page by category from the URL", async ({ page }) => {
  await page.goto("/#/shop?category=meal-kits");

  await expect(page.getByRole("button", { name: "Meal kits", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("article", { name: "Recipe Meal Kit" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Seasonal Vegetable Box" })).not.toBeVisible();
});

test("keeps every filter chip in one row with a single All", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/shop");

  await expect(page.getByRole("button", { name: "All", exact: true })).toHaveCount(1);

  const chipTops = await page
    .locator("div[aria-label='Shop filters']:visible > button")
    .evaluateAll((buttons) => buttons.map((button) => Math.round(button.getBoundingClientRect().top)));
  expect(new Set(chipTops).size).toBe(1);

  await page.getByRole("button", { name: "Veggies only" }).click();
  await expect(page.getByRole("article", { name: "High-Protein Kit" })).not.toBeVisible();

  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.getByRole("article", { name: "High-Protein Kit" })).toBeVisible();
});

test("shows a not-found fallback for an unknown product", async ({ page }) => {
  await page.goto("/#/shop/not-a-real-product");

  await expect(page.getByRole("heading", { name: "That product is not on the shelf." })).toBeVisible();
  await page.getByRole("link", { name: "Browse all products" }).click();
  await expect(page).toHaveURL(/#\/shop$/);
});
