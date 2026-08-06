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

function sampleProduct(overrides = {}) {
  return {
    id: "veg-box",
    sku: "VB-1",
    name: "Vegetable Box",
    eyebrow: "House favourite",
    description: "A weekly box of seasonal greens.",
    image: "",
    alt: "",
    category: "Fresh boxes",
    price_amount: 400,
    price_unit: "/ box",
    servings: "2–3",
    availability: "In season",
    delivery_estimate: "Delivery window at checkout",
    cooking_time: "",
    ingredients: "",
    allergen_notice: "",
    storage: "",
    source: "",
    nutrition: "",
    tags: ["seasonal"],
    collections: ["top-pick"],
    sort_order: 0,
    published: true,
    ...overrides,
  };
}

function sampleFarmer(overrides = {}) {
  return {
    id: "pema-dorji",
    name: "Pema Dorji",
    location: "Paro, Bhutan",
    dzongkhag: "Paro",
    products: ["Cabbage", "Carrots"],
    tags: ["Vegetable"],
    years_farming: 18,
    bio: "Third-generation farmer.",
    verified: true,
    partner_since: 2025,
    image: "",
    sort_order: 0,
    published: true,
    ...overrides,
  };
}

type Store = { products: Record<string, unknown>[]; farmers: Record<string, unknown>[] };

async function mockCatalogAdmin(page) {
  const store: Store = { products: [sampleProduct()], farmers: [sampleFarmer()] };

  await page.route("**/auth/v1/token*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionBody) }),
  );
  await page.route("**/auth/v1/user", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionBody.user) }),
  );
  await page.route("**/rest/v1/rpc/is_admin", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "true" }),
  );

  const handleTable = (table: "products" | "farmers") =>
    async (route) => {
      const request = route.request();
      const method = request.method();
      const url = new URL(request.url());
      const select = url.searchParams.get("select") ?? "";
      if (method === "GET" && select.includes("id") && !select.includes("sort_order")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(store[table].map((row) => ({ id: row.id }))),
        });
      }
      if (method === "GET") {
        const sorted = [...store[table]].sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sorted) });
      }
      if (method === "POST") {
        const parsed = JSON.parse(request.postData() ?? "[]");
        const body = (Array.isArray(parsed) ? parsed : [parsed]) as Record<string, unknown>[];
        for (const row of body) {
          const index = store[table].findIndex((item) => item.id === row.id);
          if (index >= 0) store[table][index] = { ...store[table][index], ...row };
          else store[table].push({ ...row });
        }
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(body) });
      }
      if (method === "DELETE") {
        const id = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
        store[table] = store[table].filter((row) => row.id !== id);
        return route.fulfill({ status: 204, body: "" });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    };

  await page.route("**/rest/v1/products*", handleTable("products"));
  await page.route("**/rest/v1/farmers*", handleTable("farmers"));

  await page.route("**/storage/v1/object/catalog/products/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "products/veg-box/1.png" }) }),
  );
}

async function signInAsAdmin(page) {
  await page.goto("/#/admin");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to the Zama admin." })).toBeVisible();
}

test("creates and edits a product", async ({ page }) => {
  await mockCatalogAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Products" }).click();
  await expect(page.getByRole("row", { name: /Vegetable Box/ })).toBeVisible();

  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("heading", { name: "New product" })).toBeVisible();
  await page.getByLabel("Name *").fill("Meal Kit");
  await page.getByLabel("Category").selectOption("Meal kits");
  await page.getByRole("button", { name: "Save product" }).click();

  await expect(page.getByText("Created Meal Kit.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Meal Kit/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Meal kits" })).toBeVisible();

  await page.getByRole("row", { name: /Meal Kit/ }).getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Name *").fill("Meal Kit Pro");
  await page.getByRole("button", { name: "Save product" }).click();

  await expect(page.getByText("Saved Meal Kit Pro.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Meal Kit Pro/ })).toBeVisible();
});

test("toggles a product to draft and deletes it", async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
  await mockCatalogAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Products" }).click();
  await page.getByRole("row", { name: /Vegetable Box/ }).getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Published (visible on the site)").uncheck();
  await page.getByRole("button", { name: "Save product" }).click();

  await expect(page.getByText("Saved Vegetable Box.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Vegetable Box/ })).toContainText("Draft");

  await page.getByRole("row", { name: /Vegetable Box/ }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted Vegetable Box.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Vegetable Box/ })).toHaveCount(0);
});

test("uploads a product image from a file", async ({ page }) => {
  await mockCatalogAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Products" }).click();
  await page.getByRole("row", { name: /Vegetable Box/ }).getByRole("button", { name: "Edit" }).click();

  await page.locator('input[type="file"]').setInputFiles({
    name: "box.png",
    mimeType: "image/png",
    buffer: Buffer.from("not-a-real-png", "utf-8"),
  });

  await expect(page.getByPlaceholder("Paste an image URL, or upload a file")).toHaveValue(/storage\/v1\/object\/public\/catalog\/products\//);
});

test("creates, edits, and deletes a farmer", async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
  await mockCatalogAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Farmers" }).click();
  await expect(page.getByRole("row", { name: /Pema Dorji/ })).toBeVisible();

  await page.getByRole("button", { name: "Add farmer" }).click();
  await page.getByLabel("Name *").fill("Yeshey Wangmo");
  await page.getByRole("button", { name: "Save farmer" }).click();

  await expect(page.getByText("Created Yeshey Wangmo.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Yeshey Wangmo/ })).toBeVisible();

  await page.getByRole("row", { name: /Yeshey Wangmo/ }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted Yeshey Wangmo.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Yeshey Wangmo/ })).toHaveCount(0);
});

test("reorders products with the arrow buttons", async ({ page }) => {
  await mockCatalogAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Products" }).click();
  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByLabel("Name *").fill("Second Box");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("row", { name: /Second Box/ })).toBeVisible();

  const firstRow = page.getByRole("row", { name: /Second Box/ });
  await firstRow.getByRole("button", { name: "Move Second Box up" }).click();

  await expect(page.getByRole("row", { name: /Second Box/ })).toBeVisible();
  const rows = page.locator("tbody tr");
  await expect(rows.first()).toContainText("Second Box");
});
