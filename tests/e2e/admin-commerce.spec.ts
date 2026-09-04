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

function sampleCustomer(overrides = {}) {
  return {
    id: "cus-karma",
    name: "Karma Wangdi",
    email: "karma.wangdi@gmail.com",
    phone: "+975 17 123 456",
    area: "Thimphu",
    dzongkhag: "Thimphu",
    address: "Changzamtog, Thimphu",
    status: "active",
    created_at: "2026-01-15T09:00:00.000Z",
    ...overrides,
  };
}

function sampleOrder(overrides = {}) {
  return {
    id: "ZAM-2026-0200",
    customer_id: "cus-karma",
    status: "pending",
    items: [{ product_id: "veg-box", name: "Vegetable Box", quantity: 1, price: 400 }],
    total: 400,
    payment_status: "pending",
    payment_method: "COD",
    payment_reference: null,
    delivery_date: "2026-08-15",
    delivery_area: "Thimphu",
    notes: "",
    created_at: "2026-08-12T09:00:00.000Z",
    history: [{ status: "pending", at: "2026-08-12T09:00:00.000Z" }],
    ...overrides,
  };
}

type Store = {
  products: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  subscriptions: Record<string, unknown>[];
  deliveries: Record<string, unknown>[];
  payments: Record<string, unknown>[];
};

async function mockAdmin(page, { commerceLive }: { commerceLive: boolean }) {
  const store: Store = {
    products: [
      sampleProduct({ name: "Vegetable Box" }),
      sampleProduct({ id: "grocery-top-up", sku: "GT-1", name: "Grocery Top-Up", category: "Fresh boxes", sort_order: 1 }),
    ],
    inventory: [],
    customers: [sampleCustomer()],
    orders: [sampleOrder()],
    subscriptions: [sampleOrder({ id: "SUB-1", customer_id: "cus-karma", status: "active", items: [], total: 500, subscription: true })],
    deliveries: [sampleOrder({ id: "DEL-1", customer_id: "cus-karma", status: "preparing", items: [], total: 0, delivery: true })],
    payments: [sampleOrder({ id: "PAY-1", customer_id: "cus-karma", status: "paid", items: [], total: 400, payment: true })],
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

  const table = (name: keyof Store) =>
    async (route) => {
      const request = route.request();
      const method = request.method();
      const url = new URL(request.url());

      if (name === "inventory" || name === "customers" || name === "orders" || name === "subscriptions" || name === "deliveries" || name === "payments") {
        if (!commerceLive) {
          return route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ message: `relation "${name}" does not exist` }),
          });
        }
      }

      if (method === "GET") {
        const rows = [...store[name]].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows) });
      }
      if (method === "PATCH") {
        const id = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
        const parsed = JSON.parse(request.postData() ?? "{}");
        const index = store[name].findIndex((row) => row.id === id);
        if (index >= 0) store[name][index] = { ...store[name][index], ...parsed };
        return route.fulfill({ status: 204, body: "" });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    };

  for (const name of ["products", "inventory", "customers", "orders", "subscriptions", "deliveries", "payments"] as const) {
    await page.route(`**/rest/v1/${name}*`, table(name));
  }
  await page.route("**/rest/v1/reviews*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/rest/v1/farmers*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/rest/v1/launch_interests*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/rest/v1/content_blocks*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/rest/v1/product_ingredients*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/rest/v1/inventory_items*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/rest/v1/rpc/deduct_order_inventory*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", deducted: false }) }),
  );
}

async function signInAsAdmin(page) {
  await page.goto("/#/admin");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to the Zama admin." })).toBeVisible();
}

test("overview shows live commerce stats without the dev notice", async ({ page }) => {
  await mockAdmin(page, { commerceLive: true });
  await signInAsAdmin(page);

  await expect(page.getByText("Showing example data.")).toHaveCount(0);
  await expect(page.getByRole("main").getByText("Orders", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("Revenue", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "ZAM-2026-0200" })).toBeVisible();
});

test("orders tab lists, searches, and updates a live order", async ({ page }) => {
  await mockAdmin(page, { commerceLive: true });
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Orders" }).click();
  const row = page.getByRole("row", { name: /ZAM-2026-0200/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Pending");

  await page.getByRole("row", { name: /ZAM-2026-0200/ }).getByRole("button", { name: "View" }).click();
  await expect(page.getByRole("heading", { name: "Order ZAM-2026-0200" })).toBeVisible();
  await expect(page.getByText("Vegetable Box")).toBeVisible();

  const detailSelect = page.getByLabel("Change status");
  await detailSelect.selectOption("confirmed");
  await page.getByRole("alertdialog").getByRole("button", { name: "Update" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.getByRole("button", { name: "← Back to orders" }).click();
  await expect(page.getByRole("row", { name: /ZAM-2026-0200/ })).toContainText("Confirmed");
});

test("orders tab falls back to dev data with writes disabled", async ({ page }) => {
  await mockAdmin(page, { commerceLive: false });
  await signInAsAdmin(page);

  await expect(page.getByText("Showing example data.")).toBeVisible();

  await page.getByRole("button", { name: "Orders" }).click();
  await expect(page.getByRole("row", { name: /ZAM-2026-0141/ })).toBeVisible();
  const selects = page.getByLabel("Change status");
  await expect(selects.first()).toBeDisabled();

  await page.getByRole("row", { name: /ZAM-2026-0141/ }).getByRole("button", { name: "View" }).click();
  await expect(page.getByRole("heading", { name: "Order ZAM-2026-0141" })).toBeVisible();
  await expect(page.getByText("Meal Kit Box")).toBeVisible();
});

test("products fall back to example stock levels without the stock columns", async ({ page }) => {
  await mockAdmin(page, { commerceLive: false });
  await signInAsAdmin(page);

  await expect(page.getByText("Showing example data.")).toBeVisible();

  await page.getByRole("button", { name: "Products" }).click();
  await expect(page.getByRole("row", { name: /Vegetable Box/ })).toBeVisible();
  await expect(page.getByText("Showing example stock levels. Run", { exact: false })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Out of stock · 0/ })).toBeVisible();
});

test("customers tab derives order stats and subscription status", async ({ page }) => {
  await mockAdmin(page, { commerceLive: true });
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Customers" }).click();
  const row = page.getByRole("row", { name: /Karma Wangdi/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Active");
  await expect(row).toContainText("Nu. 400");

  await row.getByRole("button", { name: "View" }).click();
  await expect(page.getByRole("heading", { name: "Karma Wangdi" })).toBeVisible();
  await expect(page.getByText("karma.wangdi@gmail.com")).toBeVisible();
  await expect(page.getByRole("row", { name: /ZAM-2026-0200/ })).toBeVisible();
});

test("every admin section renders in dev mode without crashing", async ({ page }) => {
  await mockAdmin(page, { commerceLive: false });
  await signInAsAdmin(page);

  const sections: [string, string][] = [
    ["Overview", "Welcome to the Zama admin."],
    ["Orders", "Orders"],
    ["Products", "Products"],
    ["Farmers", "Farmers"],
    ["Customers", "Customers"],
    ["Waitlist", "Waitlist"],
    ["Reviews", "Reviews"],
    ["Subscriptions", "Subscriptions"],
    ["Content", "Content blocks"],
  ];

  for (const [label, heading] of sections) {
    if (label !== "Overview") {
      await page.getByRole("button", { name: label, exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  await page.getByRole("button", { name: "Orders", exact: true }).click();
  await page.getByRole("button", { name: /^Deliveries/ }).click();
  await expect(page.getByRole("heading", { name: "Deliveries" })).toBeVisible();
  await page.getByRole("button", { name: /^Payments/ }).click();
  await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
});

test("sidebar collapses to an icon rail with tooltips and expands back", async ({ page }) => {
  await mockAdmin(page, { commerceLive: false });
  await signInAsAdmin(page);

  const sidebar = page.getByRole("complementary", { name: "Admin sections" });
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");

  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");

  await sidebar.getByRole("button", { name: "Orders" }).hover();
  await expect(page.getByRole("tooltip", { name: "Orders" })).toBeVisible();

  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
});
