import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const responsiveWidths = [320, 366, 390, 768, 1440] as const;

for (const width of responsiveWidths) {
  test(`keeps meaningful content inside a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const layout = await page.evaluate(() => {
      const selectors = [
        ".site-header",
        "#hero-title",
        ".market-board",
        ".market-ticket",
        ".shop-note-card",
        ".source-map-shell",
        ".price-card",
        ".delivery-ledger",
        "#trust",
        "#trust-title",
        ".trust-stamp",
        ".field-notebook",
        ".site-footer nav",
      ];

      return selectors.flatMap((selector) => [...document.querySelectorAll(selector)].map((element) => {
        const rect = element.getBoundingClientRect();
        return { selector, left: rect.left, right: rect.right };
      }));
    });

    for (const element of layout) {
      expect.soft(element.left, `${element.selector} left edge`).toBeGreaterThanOrEqual(-1);
      expect.soft(element.right, `${element.selector} right edge`).toBeLessThanOrEqual(width + 1);
    }
  });
}

test("opens mobile navigation with an accessible state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menuButton = page.locator('button[aria-controls="mobile-menu"]');

  await expect(menuButton).toHaveAttribute("aria-label", "Open menu");
  await menuButton.click();

  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(menuButton).toHaveAttribute("aria-label", "Close menu");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
});

test("keeps the desktop navigation on one compact row", async ({ page }) => {
  await page.setViewportSize({ width: 1157, height: 700 });
  await page.goto("/");

  const linkTops = await page.locator(".site-nav a").evaluateAll((links) => links.map((link) => Math.round(link.getBoundingClientRect().top)));
  expect(Math.max(...linkTops) - Math.min(...linkTops)).toBeLessThanOrEqual(1);
});

test("keeps the home shop tiles simple and links to filtered shop pages", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#shop");

  const tiles = page.locator("#shop-category-grid > a");
  await expect(tiles).toHaveCount(5);
  await expect(tiles.first().getByRole("heading")).toBeVisible();
  await expect(page.locator("#shop-category-grid details")).toHaveCount(0);

  await expect(page.getByRole("link", { name: /^Meal Kits,/ })).toHaveAttribute("href", "#/shop?category=meal-kits");
  await expect(page.getByRole("link", { name: /^Groceries,/ })).toHaveAttribute("href", "#/shop?category=groceries");
  await expect(page.getByRole("link", { name: /^Vegetables,/ })).toHaveAttribute("href", "#/shop?category=vegetables");
  await expect(page.getByRole("link", { name: /^Fruits,/ })).toHaveAttribute("href", "#/shop?category=fruits");
  await expect(page.getByRole("link", { name: /^Customize your box,/ })).toHaveAttribute("href", "#/shop?category=custom-boxes");
});

test("opens a filtered shop page from a home shop tile", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#shop");

  await page.getByRole("link", { name: /^Vegetables,/ }).click();
  await expect(page).toHaveURL(/#\/shop\?category=vegetables/);
  await expect(page.getByRole("article", { name: "Seasonal Vegetable Box" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Grocery Top-Up" })).not.toBeVisible();
});

test("updates the URL when a shop category is selected", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/shop");
  await page.getByRole("button", { name: "Meal kits", exact: true }).click();
  await expect(page).toHaveURL(/category=meal-kits/);
});

test("adds a product to the header cart and opens the drawer", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#/shop/meal-kit-box");

  await page.getByRole("button", { name: "Add Recipe Meal Kit to cart" }).click();
  const cartButton = page.getByRole("button", { name: "Open cart, 1 item" });
  await expect(cartButton).toBeVisible();
  await cartButton.click();

  const drawer = page.getByRole("dialog", { name: "Market picks" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Recipe Meal Kit")).toBeVisible();
  await expect(drawer.getByLabel("1 in cart")).toBeVisible();

  const summary = drawer.locator(".cart-summary-bar");
  const [drawerBox, summaryBox] = await Promise.all([drawer.boundingBox(), summary.boundingBox()]);
  expect(summaryBox?.y).toBeGreaterThan(drawerBox?.y ?? 0);
  expect((summaryBox?.y ?? 0) + (summaryBox?.height ?? 0)).toBeCloseTo((drawerBox?.y ?? 0) + (drawerBox?.height ?? 0), 0);
});

test("fills the full phone viewport with the cart drawer", async ({ page }) => {
  const phoneViewport = { width: 390, height: 844 };
  await page.setViewportSize(phoneViewport);
  await page.goto("/#/shop/seasonal-vegetable-box");

  await page.getByRole("button", { name: "Add Seasonal Vegetable Box to cart" }).click();
  await page.getByRole("button", { name: "Open cart, 1 item" }).click();

  const drawer = page.getByRole("dialog", { name: "Market picks" });
  const drawerBox = await drawer.boundingBox();
  expect(drawerBox?.y).toBeCloseTo(0, 0);
  expect(drawerBox?.height).toBeCloseTo(phoneViewport.height, 0);
  expect(drawerBox?.width).toBeCloseTo(phoneViewport.width, 0);
});

test("renders the farmer carousel on the home page", async ({ page }) => {
  await page.goto("/#farmers");
  await expect(page.getByRole("heading", { name: /Real people behind every ingredient/ })).toBeVisible();
  await expect(page.getByText("Pema Dorji")).toBeVisible();
  await expect(page.getByRole("link", { name: /View all farmers/i })).toHaveAttribute("href", "#/farmers");
});

test("shows the latest seasonal update and a story link on the farmer carousel", async ({ page }) => {
  await page.goto("/#farmers");
  await expect(page.getByText(/harvesting crisp cabbages and carrots from the terraced fields/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Read their story/i }).first()).toBeVisible();
});

test("opens a farmer story from the landing carousel", async ({ page }) => {
  await page.goto("/#farmers");
  await page.getByRole("link", { name: /Read their story/i }).first().click();
  await expect(page).toHaveURL(/#\/farmers\?farmer=pema-dorji/);
  await expect(page.getByText(/Pema Dorji's grandfather/)).toBeVisible();
});

test("farmers page search filters by name and location", async ({ page }) => {
  await page.goto("/#/farmers");
  await expect(page.getByRole("heading", { name: /Meet the people growing your food/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pema Dorji" })).toBeVisible();

  const search = page.getByPlaceholder("Search by name, location, or product...");
  await search.fill("Paro");
  await expect(page.getByRole("heading", { name: "Pema Dorji" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Yeshey Wangmo" })).not.toBeVisible();

  await search.fill("Tashi");
  await expect(page.getByRole("heading", { name: "Tashi Phuntsho" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pema Dorji" })).not.toBeVisible();

  await search.fill("");
  await expect(page.getByRole("heading", { name: "Pema Dorji" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Yeshey Wangmo" })).toBeVisible();
});

test("has no serious or critical automated accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");

  expect(blocking).toEqual([]);
});
