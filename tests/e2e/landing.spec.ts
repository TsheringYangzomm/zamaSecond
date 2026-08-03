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

test("keeps the home shop cards simple and opens the full product page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#shop");
  const grocery = page.getByRole("article", { name: "Grocery Top-Up" });

  await expect(grocery.locator("details")).toHaveCount(0);
  await expect(grocery.getByRole("link", { name: "View details" })).toHaveAttribute("href", "#/shop/grocery-top-up");

  await grocery.getByRole("link", { name: "View details" }).click();
  await expect(page).toHaveURL(/#\/shop\/grocery-top-up/);
  await expect(page.getByRole("heading", { name: "Grocery Top-Up", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What previous buyers say" })).toBeVisible();
});

test("updates the URL when a shop category is selected", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/shop");
  await page.getByRole("button", { name: "Meal kits", exact: true }).click();
  await expect(page).toHaveURL(/category=meal-kits/);
});

test("adds a product to the header cart and opens the drawer", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#shop");

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
  await page.goto("/#shop");

  await page.getByRole("button", { name: "Add Seasonal Vegetable Box to cart" }).click();
  await page.getByRole("button", { name: "Open cart, 1 item" }).click();

  const drawer = page.getByRole("dialog", { name: "Market picks" });
  const drawerBox = await drawer.boundingBox();
  expect(drawerBox?.y).toBeCloseTo(0, 0);
  expect(drawerBox?.height).toBeCloseTo(phoneViewport.height, 0);
  expect(drawerBox?.width).toBeCloseTo(phoneViewport.width, 0);
});

test("moves through the farmer story carousel", async ({ page }) => {
  await page.goto("/#farmers");
  await expect(page.getByRole("heading", { name: "Who grew it?", level: 4 })).toBeVisible();

  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByRole("heading", { name: "What is in season?", level: 4 })).toBeVisible();
});

test("has no serious or critical automated accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");

  expect(blocking).toEqual([]);
});
