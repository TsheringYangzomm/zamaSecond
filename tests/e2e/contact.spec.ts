import { expect, test } from "@playwright/test";

test("opens the contact page from the footer and submits a message", async ({ page }) => {
  await page.route("**/api.emailjs.com/api/v1.0/email/send", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );

  await page.goto("/");
  await page.locator("footer a", { hasText: "Contact Us" }).click();

  await expect(page).toHaveURL(/#\/contact/);
  await expect(page.getByRole("heading", { name: /ask a question or share feedback/i })).toBeVisible();

  await page.getByLabel("Email address").fill("hello@example.com");
  await page.getByLabel("Message").fill("Do you deliver to Babesa?");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.locator("#contact-status")).toContainText(/Preview saved|on its way/);
});

test("returns to the full shop page from the contact page", async ({ page }) => {
  await page.goto("/#/contact");
  await expect(page.getByRole("heading", { name: /ask a question or share feedback/i })).toBeVisible();

  await page.getByRole("link", { name: "Shop" }).click();

  await expect(page).toHaveURL(/#\/shop$/);
  await expect(page.getByRole("heading", { name: /all products, one basket/i })).toBeVisible();
});

test("shows the EmailJS reason when the email service rejects the send", async ({ page }) => {
  await page.route("**/api.emailjs.com/api/v1.0/email/send", (route) =>
    route.fulfill({ status: 412, contentType: "application/json", body: "Gmail_API: Invalid grant. Please reconnect your Gmail account" }),
  );

  await page.goto("/#/contact");
  await page.getByLabel("Email address").fill("hello@example.com");
  await page.getByLabel("Message").fill("Do you deliver to Babesa?");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.locator("#contact-status")).toContainText("Invalid grant");
  await expect(page.locator("#contact-status")).toContainText("hello@zama.bt");
});
