import { chromium } from "@playwright/test";

const browser = await chromium.launch();

for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto("http://127.0.0.1:4173/");
  await page.locator(".shop-section").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.locator(".shop-section").screenshot({ path: `shop-section-${width}.png` });
  await page.close();
}
await browser.close();
console.log("DONE");
