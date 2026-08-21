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

function stockItem(id: string, name: string, category: string, unit: string, stockQuantity: number | null, stockAlertAt: number | null, supplier = "") {
  return {
    id,
    name,
    category,
    unit,
    supplier,
    stock_quantity: stockQuantity,
    stock_alert_at: stockAlertAt,
  };
}

function stockLot(itemId: string, supplier: string, quantity: number) {
  return {
    id: `lot-${itemId}-${supplier.replace(/\s+/g, "-").toLowerCase()}`,
    item_id: itemId,
    supplier,
    quantity,
    remaining: quantity,
    received_date: "2026-08-10",
    unit_cost: null,
    batch_reference: "",
    notes: "",
    created_at: "2026-08-10T06:00:00Z",
  };
}

function stockFarmer(id: string, name: string, dzongkhag: string) {
  return {
    id,
    name,
    location: `${dzongkhag}, Bhutan`,
    dzongkhag,
    products: [],
    tags: [],
    years_farming: 10,
    bio: "",
    verified: true,
    partner_since: 2025,
    image: "",
    sort_order: 0,
    published: true,
  };
}

type Store = { items: Record<string, unknown>[]; lots: Record<string, unknown>[]; farmers: Record<string, unknown>[] };

async function mockInventoryAdmin(page, slowWriteMs = 0) {
  const store: Store = {
    items: [
      stockItem("potato", "Potato", "Fresh produce", "kg", 20, 5, "Pema Dorji"),
      stockItem("chicken-breast", "Chicken Breast", "Meat & protein", "kg", 3, 5),
      stockItem("chips", "Chips", "Snacks", "pack", 0, 5),
      stockItem("milk-powder", "Milk Powder", "Dairy & pantry", "pack", null, null),
    ],
    lots: [
      stockLot("potato", "Pema Dorji", 20),
      stockLot("chicken-breast", "", 3),
    ],
    farmers: [
      stockFarmer("pema-dorji", "Pema Dorji", "Paro"),
      stockFarmer("karchung", "Karchung", "Bumthang"),
    ],
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

  const handleItems = async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "GET") {
      const rows = [...store.items];
      rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows) });
    }
    if (method === "POST") {
      const parsed = JSON.parse(request.postData() ?? "{}");
      const index = store.items.findIndex((row) => row.id === parsed.id);
      if (index >= 0) store.items[index] = { ...store.items[index], ...parsed };
      else store.items.push(parsed);
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(parsed) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  };

  const handleLots = async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(store.lots) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  };

  const handleFarmers = async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      const sorted = [...store.farmers].sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sorted) });
    }
    if (method === "POST") {
      const parsed = JSON.parse(route.request().postData() ?? "{}");
      const index = store.farmers.findIndex((row) => row.id === parsed.id);
      if (index >= 0) store.farmers[index] = { ...store.farmers[index], ...parsed };
      else store.farmers.push(parsed);
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(parsed) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  };

  const handleAddStock = async (route) => {
    if (slowWriteMs > 0) await new Promise((resolve) => setTimeout(resolve, slowWriteMs));
    const body = JSON.parse(route.request().postData() ?? "{}");
    const lot = {
      id: `lot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      item_id: body.p_item_id,
      supplier: body.p_supplier,
      quantity: body.p_quantity,
      remaining: body.p_quantity,
      received_date: body.p_received_date,
      unit_cost: body.p_unit_cost,
      batch_reference: body.p_batch_reference,
      notes: body.p_notes,
      created_at: new Date().toISOString(),
    };
    store.lots.push(lot);
    const item = store.items.find((row) => row.id === body.p_item_id);
    if (item) {
      const total = store.lots
        .filter((entry) => entry.item_id === body.p_item_id)
        .reduce((sum, entry) => sum + Number(entry.remaining), 0);
      item.stock_quantity = total;
      item.updated_at = lot.created_at;
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(lot) });
  };

  await page.route("**/rest/v1/inventory_items*", handleItems);
  await page.route("**/rest/v1/inventory_stock_lots*", handleLots);
  await page.route("**/rest/v1/inventory_stock_history*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/rest/v1/farmers*", handleFarmers);
  await page.route("**/rest/v1/rpc/add_inventory_stock", handleAddStock);
}

async function signInAsAdmin(page) {
  await page.goto("/#/admin");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to the Zama admin." })).toBeVisible();
}

async function openInventory(page) {
  await page.getByRole("button", { name: "Inventory" }).click();
  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
}

async function openAddStockModal(page) {
  await page.getByRole("button", { name: "+ Add stock" }).click();
  await expect(page.getByRole("dialog", { name: "Add stock" })).toBeVisible();
}

test("shows stock levels for every item and can filter by level", async ({ page }) => {
  await mockInventoryAdmin(page);
  await signInAsAdmin(page);
  await openInventory(page);

  const itemTable = page.getByRole("table", { name: "Item stock levels" });

  await expect(itemTable.getByRole("row", { name: /Potato/ })).toContainText("In stock");
  await expect(itemTable.getByRole("row", { name: /Chicken Breast/ })).toContainText("Low stock");
  await expect(itemTable.getByRole("row", { name: /Chips/ })).toContainText("Out of stock");
  await expect(itemTable.getByRole("row", { name: /Milk Powder/ })).toContainText("Not tracked");

  await page.getByLabel("Filter by stock status").selectOption("out");
  await expect(itemTable.getByRole("row", { name: /Chips/ })).toBeVisible();
  await expect(itemTable.getByRole("row", { name: /Potato/ })).toHaveCount(0);

  await page.getByLabel("Filter by stock status").selectOption("");
  await expect(itemTable.getByRole("row", { name: /Potato/ })).toBeVisible();
});

test("shows inventory health computed from the live data", async ({ page }) => {
  await mockInventoryAdmin(page);
  await signInAsAdmin(page);
  await openInventory(page);

  await expect(page.getByText("33% of tracked items are currently available")).toBeVisible();
  await expect(page.getByText("1 In stock", { exact: true })).toBeVisible();
  await expect(page.getByText("1 Low stock", { exact: true })).toBeVisible();
  await expect(page.getByText("1 Out of stock", { exact: true })).toBeVisible();
});

test("searches, filters, and sorts inventory together", async ({ page }) => {
  await mockInventoryAdmin(page);
  await signInAsAdmin(page);
  await openInventory(page);

  const itemTable = page.getByRole("table", { name: "Item stock levels" });
  const bodyRows = itemTable.locator("tbody tr");

  await page.getByLabel("Search inventory").fill("Pema");
  await expect(bodyRows.filter({ hasText: "Potato" })).toBeVisible();
  await expect(bodyRows.filter({ hasText: "Chicken" })).toHaveCount(0);

  await page.getByLabel("Search inventory").fill("");
  await page.getByLabel("Filter by category").selectOption("Fresh produce");
  await page.getByLabel("Filter by supplier").selectOption("Pema Dorji");
  await page.getByLabel("Filter by stock status").selectOption("in");
  await expect(bodyRows).toHaveCount(1);
  await expect(bodyRows.first()).toContainText("Potato");

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(bodyRows).toHaveCount(4);

  await page.getByLabel("Sort by").selectOption("qty-desc");
  await expect(bodyRows.nth(0)).toContainText("Potato");
  await expect(bodyRows.nth(1)).toContainText("Chicken Breast");
  await expect(bodyRows.nth(2)).toContainText("Chips");
  await expect(bodyRows.nth(3)).toContainText("Milk Powder");
});

test("Search button applies the query without reloading and Clear filters resets it", async ({ page }) => {
  await mockInventoryAdmin(page);
  await signInAsAdmin(page);
  await openInventory(page);

  const itemTable = page.getByRole("table", { name: "Item stock levels" });
  const bodyRows = itemTable.locator("tbody tr");

  const searchButton = page.getByRole("button", { name: "Search" });
  await expect(searchButton).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear filters" })).toHaveCount(0);

  await page.getByLabel("Search inventory").fill("Pema");
  await searchButton.click();
  await expect(bodyRows).toHaveCount(1);
  await expect(bodyRows.first()).toContainText("Potato");
  await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(bodyRows).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Clear filters" })).toHaveCount(0);
});

test("adds stock to an existing product without duplicating it", async ({ page }) => {
  await mockInventoryAdmin(page);
  await signInAsAdmin(page);
  await openInventory(page);
  await openAddStockModal(page);

  const modal = page.getByRole("dialog", { name: "Add stock" });
  await modal.getByLabel("Product").selectOption({ label: "Potato" });
  await modal.getByLabel("Supplier / Farmer").selectOption("Karchung");
  await modal.getByLabel("Quantity received").fill("30");
  await modal.getByRole("button", { name: "Add stock", exact: true }).click();

  await expect(page.getByText("Added 30 kg of Potato from Karchung.")).toBeVisible();

  const itemTable = page.getByRole("table", { name: "Item stock levels" });
  const potatoRows = itemTable.getByRole("row", { name: /Potato/ });
  await expect(potatoRows).toHaveCount(1);
  await expect(potatoRows).toContainText("50 kg");
  await expect(potatoRows).toContainText("2 suppliers");
  await expect(potatoRows).toContainText("In stock");
});

test("keeps the typed values in the add-stock modal while the save is in flight", async ({ page }) => {
  await mockInventoryAdmin(page, 600);
  await signInAsAdmin(page);
  await openInventory(page);
  await openAddStockModal(page);

  const modal = page.getByRole("dialog", { name: "Add stock" });
  await modal.getByLabel("Product").selectOption({ label: "Potato" });
  await modal.getByLabel("Supplier / Farmer").selectOption("Karchung");
  const quantity = modal.getByLabel("Quantity received");
  await quantity.fill("30");
  await modal.getByRole("button", { name: "Add stock", exact: true }).click();

  await page.waitForTimeout(300);
  await expect(quantity).toHaveValue("30");

  await expect(page.getByText("Added 30 kg of Potato from Karchung.")).toBeVisible();
  await expect(page.getByRole("table", { name: "Item stock levels" }).getByRole("row", { name: /Potato/ })).toContainText("50 kg");
});

test("shows validation errors when required fields are missing", async ({ page }) => {
  await mockInventoryAdmin(page);
  await signInAsAdmin(page);
  await openInventory(page);
  await openAddStockModal(page);

  const modal = page.getByRole("dialog", { name: "Add stock" });
  await modal.getByRole("button", { name: "Add stock", exact: true }).click();
  await expect(page.getByText("Product, supplier, and quantity received are required.")).toBeVisible();
});

test("adds a new product and a new farmer as the supplier from the modal", async ({ page }) => {
  await mockInventoryAdmin(page);
  await signInAsAdmin(page);
  await openInventory(page);
  await openAddStockModal(page);

  const modal = page.getByRole("dialog", { name: "Add stock" });
  await modal.getByLabel("Product").selectOption({ label: "+ Add a new product…" });
  await modal.getByLabel("New product name").fill("Pumpkin");
  await modal.getByLabel("Category", { exact: true }).selectOption("Fresh produce");
  await modal.getByLabel("Unit", { exact: true }).selectOption("kg");
  await modal.getByLabel("Quantity received").fill("12");
  await modal.getByLabel("Supplier / Farmer").selectOption({ label: "+ Add a new farmer…" });
  await modal.getByLabel("New supplier name").fill("Tashi Dorji");
  await modal.getByRole("button", { name: "Add stock", exact: true }).click();

  await expect(page.getByText("Added Pumpkin to inventory with 12 kg from Tashi Dorji.")).toBeVisible();

  const itemTable = page.getByRole("table", { name: "Item stock levels" });
  const pumpkinRow = itemTable.getByRole("row", { name: /Pumpkin/ });
  await expect(pumpkinRow).toContainText("12 kg");
  await expect(pumpkinRow).toContainText("Tashi Dorji");
  await expect(pumpkinRow).toContainText("In stock");
});

test("shows the stock breakdown across suppliers", async ({ page }) => {
  await mockInventoryAdmin(page);
  await signInAsAdmin(page);
  await openInventory(page);
  await openAddStockModal(page);

  const modal = page.getByRole("dialog", { name: "Add stock" });
  await modal.getByLabel("Product").selectOption({ label: "Potato" });
  await modal.getByLabel("Supplier / Farmer").selectOption("Karchung");
  await modal.getByLabel("Quantity received").fill("30");
  await modal.getByRole("button", { name: "Add stock", exact: true }).click();
  await expect(page.getByText("Added 30 kg of Potato from Karchung.")).toBeVisible();

  const itemTable = page.getByRole("table", { name: "Item stock levels" });
  await itemTable.getByRole("button", { name: "Potato" }).click();

  const details = page.getByRole("dialog", { name: "Potato" });
  await expect(details.getByText("50 kg")).toBeVisible();
  await expect(details.getByText("Pema Dorji")).toBeVisible();
  await expect(details.getByText("Karchung")).toBeVisible();
});
