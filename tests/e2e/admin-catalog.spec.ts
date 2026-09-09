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

function sampleInventoryItem(overrides = {}) {
  return {
    id: "potato",
    name: "Potato",
    category: "Fresh produce",
    unit: "kg",
    supplier: "Pema Dorji",
    stock_quantity: 40,
    stock_alert_at: 10,
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
    partner_since: "2025-03-14",
    image: "",
    sort_order: 0,
    published: true,
    ...overrides,
  };
}

type Store = { products: Record<string, unknown>[]; farmers: Record<string, unknown>[]; privateInfo: Record<string, unknown>[]; stories: Record<string, unknown>[]; seasonalUpdates: Record<string, unknown>[]; inventoryItems: Record<string, unknown>[]; productIngredients: Record<string, unknown>[] };

async function mockCatalogAdmin(page) {
  const store: Store = { products: [sampleProduct()], farmers: [sampleFarmer()], privateInfo: [], stories: [], seasonalUpdates: [], inventoryItems: [sampleInventoryItem()], productIngredients: [] };

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
      if (method === "PATCH") {
        const id = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
        const parsed = JSON.parse(request.postData() ?? "{}");
        const index = store[table].findIndex((item) => item.id === id);
        if (index >= 0) store[table][index] = { ...store[table][index], ...parsed };
        return route.fulfill({ status: 204, body: "" });
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

  const handlePrivateInfo = async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(store.privateInfo) });
    }
    if (method === "POST") {
      const parsed = JSON.parse(request.postData() ?? "{}");
      const index = store.privateInfo.findIndex((row) => row.farmer_id === parsed.farmer_id);
      if (index >= 0) store.privateInfo[index] = { ...store.privateInfo[index], ...parsed };
      else store.privateInfo.push(parsed);
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(parsed) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  };
  await page.route("**/rest/v1/farmer_private_info*", handlePrivateInfo);

  const handleKeyedTable = (rows: Record<string, unknown>[], keys: string[]) =>
    async (route) => {
      const request = route.request();
      const method = request.method();
      if (method === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows) });
      }
      if (method === "POST") {
        const parsed = JSON.parse(request.postData() ?? "{}");
        const index = rows.findIndex((row) => keys.every((key) => row[key] === parsed[key]));
        if (index >= 0) rows[index] = { ...rows[index], ...parsed };
        else rows.push(parsed);
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(parsed) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    };

  await page.route("**/rest/v1/farmer_stories*", handleKeyedTable(store.stories, ["farmer_id"]));
  await page.route("**/rest/v1/farmer_seasonal_updates*", handleKeyedTable(store.seasonalUpdates, ["farmer_id", "season"]));

  const handleSimpleTable = (table: "inventoryItems" | "productIngredients") =>
    async (route) => {
      const request = route.request();
      const method = request.method();
      const url = new URL(request.url());
      if (method === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(store[table]) });
      }
      if (method === "PATCH" && table === "inventoryItems") {
        const id = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
        const parsed = JSON.parse(request.postData() ?? "{}");
        const index = store[table].findIndex((row) => row.id === id);
        if (index >= 0) store[table][index] = { ...store[table][index], ...parsed };
        return route.fulfill({ status: 204, body: "" });
      }
      if (method === "POST" && table === "productIngredients") {
        const parsed = JSON.parse(request.postData() ?? "[]");
        const body = (Array.isArray(parsed) ? parsed : [parsed]) as Record<string, unknown>[];
        for (const row of body) {
          const index = store[table].findIndex((r) => r.product_id === row.product_id && r.item_id === row.item_id);
          if (index >= 0) store[table][index] = { ...store[table][index], ...row };
          else store[table].push({ ...row });
        }
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(body) });
      }
      if (method === "DELETE" && table === "productIngredients") {
        const productId = (url.searchParams.get("product_id") ?? "").replace(/^eq\./, "");
        if (productId) store[table] = store[table].filter((r) => r.product_id !== productId);
        return route.fulfill({ status: 204, body: "" });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    };

  await page.route("**/rest/v1/product_ingredients*", handleSimpleTable("productIngredients"));
  await page.route("**/rest/v1/inventory*", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("inventory_items")) {
      await handleSimpleTable("inventoryItems")(route);
      return;
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/storage/v1/object/catalog/products/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "products/veg-box/1.png" }) }),
  );
}

async function signInAsAdmin(page) {
  await page.goto("/#/admin");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("creates and edits a product", async ({ page }) => {
  await mockCatalogAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Products" }).click();
  await expect(page.getByRole("row", { name: /Vegetable Box/ })).toBeVisible();

  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("heading", { name: "What type of product are you adding?" })).toBeVisible();
  await page.getByRole("button", { name: /Meal Kits/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "New product" })).toBeVisible();
  await page.getByLabel("Name *").fill("Meal Kit");
  await page.getByLabel("Cuisine *").selectOption("Bhutanese");
  await page.getByLabel("Servings *").fill("2");
  await page.getByLabel("Difficulty *").selectOption("Easy");
  await page.getByRole("button", { name: "+ Add Item" }).click();
  await page.getByRole("dialog").getByText("Potato", { exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Add 1 item/ }).click();
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
  await mockCatalogAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Products" }).click();
  await expect(page.getByRole("row", { name: /Vegetable Box/ })).toBeVisible();
  await page.getByRole("row", { name: /Vegetable Box/ }).getByRole("button", { name: "Set inactive" }).click();

  await expect(page.getByText("Vegetable Box is inactive (shows as out of stock).")).toBeVisible();
  await expect(page.getByRole("row", { name: /Vegetable Box/ })).toContainText("Inactive");

  await page.getByRole("row", { name: /Vegetable Box/ }).getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
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
  await mockCatalogAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Farmers" }).click();
  await expect(page.getByRole("row", { name: /Pema Dorji/ })).toBeVisible();

  await page.getByRole("button", { name: "Add farmer" }).click();
  await page.getByLabel("Name *").fill("Yeshey Wangmo");
  await page.getByRole("button", { name: "Save farmer" }).click();

  await expect(page.getByText("Created Yeshey Wangmo.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Yeshey Wangmo/ })).toBeVisible();

  await page.getByRole("row", { name: /Yeshey Wangmo/ }).getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Village").fill("Dotey");
  await page.getByLabel("Phone number").fill("+975 17 000 000");
  await page.getByLabel("Farmer story").fill("Yeshey grew up in Dotey and now runs the family farm.");
  await page.getByLabel("Show story on the site").check();
  await page.getByLabel("Seasonal update").fill("Expecting a strong tomato harvest this summer.");
  await page.getByLabel("Publish this update (show on the landing page)").check();
  await page.getByRole("button", { name: "Save farmer" }).click();
  await expect(page.getByText("Saved Yeshey Wangmo.")).toBeVisible();

  await page.getByRole("row", { name: /Yeshey Wangmo/ }).getByRole("button", { name: "Edit" }).click();
  await expect(page.getByLabel("Village")).toHaveValue("Dotey");
  await expect(page.getByLabel("Phone number")).toHaveValue("+975 17 000 000");
  await expect(page.getByLabel("Farmer story")).toHaveValue("Yeshey grew up in Dotey and now runs the family farm.");
  await expect(page.getByLabel("Show story on the site")).toBeChecked();
  await expect(page.getByLabel("Seasonal update")).toHaveValue("Expecting a strong tomato harvest this summer.");
  await expect(page.getByLabel("Publish this update (show on the landing page)")).toBeChecked();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("row", { name: /Yeshey Wangmo/ }).getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted Yeshey Wangmo.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Yeshey Wangmo/ })).toHaveCount(0);
});

test("reorders products by dragging", async ({ page }) => {
  await mockCatalogAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Products" }).click();
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("heading", { name: "What type of product are you adding?" })).toBeVisible();
  await page.getByRole("button", { name: /Vegetables/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Name *").fill("Second Box");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("row", { name: /Second Box/ })).toBeVisible();

  const rows = page.locator("tbody tr");
  await rows.nth(1).dragTo(rows.nth(0));

  await expect(page.getByRole("row", { name: /Second Box/ })).toBeVisible();
  await expect(rows.first()).toContainText("Second Box");
});
