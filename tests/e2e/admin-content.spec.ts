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

type Store = { content_blocks: { key: string; value: Record<string, unknown>; updated_at: string }[] };

async function mockContentAdmin(page) {
  const store: Store = {
    content_blocks: [{ key: "hero", value: { titleA: "Farm fresh", copy: "Delivered weekly" }, updated_at: "2026-01-05T10:00:00Z" }],
  };

  await page.route("**/auth/v1/token*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionBody) }),
  );
  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionBody.user) }),
  );
  await page.route("**/rest/v1/rpc/is_admin", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "true" }),
  );

  await page.route("**/rest/v1/content_blocks*", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const select = url.searchParams.get("select") ?? "";
    if (method === "GET" && select.includes("value")) {
      const key = (url.searchParams.get("key") ?? "").replace(/^eq\./, "");
      const block = store.content_blocks.find((item) => item.key === key);
      if (!block) {
        return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ value: block.value }) });
    }
    if (method === "GET") {
      const summaries = store.content_blocks.map((block) => ({ key: block.key, updated_at: block.updated_at }));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(summaries) });
    }
    if (method === "POST") {
      const parsed = JSON.parse(request.postData() ?? "{}");
      const row = Array.isArray(parsed) ? parsed[0] : parsed;
      const existing = store.content_blocks.find((item) => item.key === row.key);
      if (existing) {
        existing.value = row.value;
        existing.updated_at = new Date().toISOString();
      } else {
        store.content_blocks.push({ key: row.key, value: row.value, updated_at: new Date().toISOString() });
      }
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([row]) });
    }
    if (method === "DELETE") {
      const key = (url.searchParams.get("key") ?? "").replace(/^eq\./, "");
      store.content_blocks = store.content_blocks.filter((item) => item.key !== key);
      return route.fulfill({ status: 204, body: "" });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
}

async function signInAsAdmin(page) {
  await page.goto("/#/admin");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to the Zama admin." })).toBeVisible();
}

test("lists blocks and edits the hero JSON", async ({ page }) => {
  await mockContentAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Content" }).click();
  await expect(page.getByRole("heading", { name: "Content blocks" })).toBeVisible();
  await expect(page.getByText("1 block")).toBeVisible();

  const heroCard = page.locator("li", { hasText: "hero" });
  await heroCard.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit block" })).toBeVisible();

  const jsonField = page.getByLabel("Block JSON");
  await jsonField.fill('{\n  "titleA": "Farm fresh",\n  "copy": "Updated copy"\n}');
  await page.getByRole("button", { name: "Save block" }).click();

  await expect(page.getByText('Saved block "hero".')).toBeVisible();
  await expect(page.locator("li", { hasText: "hero" })).toBeVisible();
});

test("adds a block and deletes it", async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
  await mockContentAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Content" }).click();
  await page.getByLabel("New block key").fill("policies");
  await page.getByRole("button", { name: "Add block" }).click();
  await expect(page.getByRole("heading", { name: "New block" })).toBeVisible();

  await page.getByLabel("Block JSON").fill('{\n  "heading": "Policies"\n}');
  await page.getByRole("button", { name: "Save block" }).click();

  await expect(page.getByText('Created block "policies".')).toBeVisible();
  await expect(page.locator("li", { hasText: "policies" })).toBeVisible();

  await page.locator("li", { hasText: "policies" }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText('Deleted block "policies".')).toBeVisible();
  await expect(page.locator("li", { hasText: "policies" })).toHaveCount(0);
});

test("shows an error for invalid JSON", async ({ page }) => {
  await mockContentAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Content" }).click();
  await page.locator("li", { hasText: "hero" }).getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Block JSON").fill("not json");
  await page.getByRole("button", { name: "Save block" }).click();

  await expect(page.getByRole("alert")).toContainText("JSON is not valid");
  await expect(page.getByRole("heading", { name: "Edit block" })).toBeVisible();
});
