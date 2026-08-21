import { expect, test } from "@playwright/test";

const adminEmail = "owner@zama.bt";

const sessionBody = {
  access_token: "mock-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "mock-refresh-token",
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: adminEmail,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const waitlistRows = [
  {
    id: 1,
    email: "hello@example.com",
    source: "hero-waitlist",
    area: "Thimphu",
    items: [{ sku: "vb-1", quantity: 2 }],
    created_at: "2026-08-01T10:00:00Z",
  },
  {
    id: 2,
    email: "second@example.com",
    source: "launch-basket",
    area: null,
    items: null,
    created_at: "2026-08-02T09:30:00Z",
  },
];

async function mockSupabaseAdmin(page) {
  await page.route("**/auth/v1/token*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionBody) }),
  );
  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionBody.user) }),
  );
  await page.route("**/rest/v1/rpc/is_admin", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "true" }),
  );
  await page.route("**/rest/v1/launch_interests*", async (route) => {
    if (route.request().method() === "DELETE") {
      return route.fulfill({ status: 204, contentType: "application/json", body: "[]" });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(waitlistRows) });
  });
}

async function signInAsAdmin(page) {
  await page.goto("/#/admin");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to the Zama admin." })).toBeVisible();
}

test("signs in as an admin and manages the waitlist", async ({ page }) => {
  await mockSupabaseAdmin(page);

  await signInAsAdmin(page);
  await expect(page.getByText(adminEmail)).toBeVisible();

  await page.getByRole("button", { name: "Waitlist" }).click();
  await expect(page.getByRole("heading", { name: "Waitlist" })).toBeVisible();
  await expect(page.getByText("2 signups")).toBeVisible();
  await expect(page.getByText("hello@example.com")).toBeVisible();
  await expect(page.getByText("second@example.com")).toBeVisible();
  await expect(page.getByText("1 item (2)")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(/Deleted hello@example.com/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "hello@example.com" })).toHaveCount(0);
});

test("exports the waitlist as a CSV file", async ({ page }) => {
  await mockSupabaseAdmin(page);

  await signInAsAdmin(page);
  await page.getByRole("button", { name: "Waitlist" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^zama-waitlist-\d{4}-\d{2}-\d{2}\.csv$/);
});
