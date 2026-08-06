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

function sampleReview(overrides = {}) {
  return {
    id: "rv-veg-1",
    product_id: "veg-box",
    author: "Karma",
    location: "Thimphu",
    rating: 5,
    date: "January 2026",
    title: "Crisp and fresh",
    body: "The greens arrived crisp and lasted the whole week.",
    verified: true,
    sort_order: 0,
    published: true,
    ...overrides,
  };
}

type Store = { products: Record<string, unknown>[]; farmers: Record<string, unknown>[]; reviews: Record<string, unknown>[] };

async function mockReviewsAdmin(page) {
  const store: Store = {
    products: [sampleProduct(), sampleProduct({ id: "meal-kit", sku: "MK-1", name: "Meal Kit", category: "Meal kits" })],
    farmers: [],
    reviews: [sampleReview()],
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

  const handleTable = (table: keyof Store) =>
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
        const rows = [...store[table]];
        if (table === "reviews") {
          rows.sort((a, b) =>
            String(a.product_id).localeCompare(String(b.product_id)) || Number(a.sort_order) - Number(b.sort_order));
        } else {
          rows.sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows) });
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
  await page.route("**/rest/v1/reviews*", handleTable("reviews"));
}

async function signInAsAdmin(page) {
  await page.goto("/#/admin");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to the Zama admin." })).toBeVisible();
}

test("lists reviews with product names", async ({ page }) => {
  await mockReviewsAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Reviews" }).click();
  await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
  await expect(page.getByText("1 review")).toBeVisible();
  await expect(page.getByRole("row", { name: /Karma/ })).toContainText("Vegetable Box");
  await expect(page.getByRole("row", { name: /Karma/ })).toContainText("5/5");
  await expect(page.getByRole("row", { name: /Karma/ })).toContainText("Crisp and fresh");
});

test("creates and edits a review", async ({ page }) => {
  await mockReviewsAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Reviews" }).click();
  await page.getByRole("button", { name: "Add review" }).click();
  await expect(page.getByRole("heading", { name: "New review" })).toBeVisible();
  await page.getByLabel("Author *").fill("Yeshey");
  await page.getByLabel("Title").fill("Lovely greens");
  await page.getByLabel("Rating").selectOption("4 stars");
  await page.getByLabel("Date").fill("March 2026");
  await page.getByRole("button", { name: "Save review" }).click();

  await expect(page.getByText("Created review by Yeshey.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Yeshey/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Yeshey/ })).toContainText("Lovely greens");

  await page.getByRole("row", { name: /Yeshey/ }).getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit review" })).toBeVisible();
  await page.getByLabel("Title").fill("Even better");
  await page.getByRole("button", { name: "Save review" }).click();

  await expect(page.getByText("Saved review by Yeshey.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Yeshey/ })).toContainText("Even better");
});

test("toggles a review to draft and deletes it", async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
  await mockReviewsAdmin(page);
  await signInAsAdmin(page);

  await page.getByRole("button", { name: "Reviews" }).click();
  await page.getByRole("row", { name: /Karma/ }).getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Published (visible on the site)").uncheck();
  await page.getByRole("button", { name: "Save review" }).click();

  await expect(page.getByText("Saved review by Karma.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Karma/ })).toContainText("Draft");

  await page.getByRole("row", { name: /Karma/ }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted review by Karma.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Karma/ })).toHaveCount(0);
});
