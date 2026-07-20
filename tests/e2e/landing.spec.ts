import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const responsiveWidths = [320, 390, 768, 1440] as const;

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

test("expanding one supporting product does not stretch its neighbors", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#shop");
  const mealKit = page.getByRole("article", { name: "Recipe Meal Kit" });
  const grocery = page.getByRole("article", { name: "Grocery Top-Up" });
  const fruit = page.getByRole("article", { name: "Seasonal Fruit Box" });
  const before = await Promise.all([mealKit.boundingBox(), fruit.boundingBox()]);

  await grocery.getByText("Product Details").click();

  const after = await Promise.all([mealKit.boundingBox(), fruit.boundingBox()]);
  expect(after[0]?.height).toBeCloseTo(before[0]?.height ?? 0, 0);
  expect(after[1]?.height).toBeCloseTo(before[1]?.height ?? 0, 0);
  await expect(grocery.getByText(/Product code:/)).toBeVisible();
});

test("updates the URL when a shop category is selected", async ({ page }) => {
  await page.goto("/#shop");
  await page.getByRole("button", { name: "Meal kits", exact: true }).click();
  await expect(page).toHaveURL(/category=meal-kits/);
});

test("has no serious or critical automated accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");

  expect(blocking).toEqual([]);
});
