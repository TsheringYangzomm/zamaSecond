import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CartProvider } from "../cart-provider";
import { shopProducts } from "../data/landing";
import { shopFilters } from "../components/shop/shop-utils";
import { ShopPage } from "./shop-page";

function renderShopPage() {
  return render(
    <CartProvider>
      <ShopPage />
    </CartProvider>,
  );
}

function matchesCollection(product: (typeof shopProducts)[number], slug: string) {
  return shopFilters.find((filter) => filter.slug === slug)?.matches(product) ?? false;
}

describe("ShopPage", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });
  it("lists every product with a link to its detail page", () => {
    renderShopPage();

    for (const product of shopProducts) {
      const card = screen.getByRole("article", { name: product.name });
      const link = within(card).getByRole("link", { name: `View ${product.name} details` });
      expect(link).toHaveAttribute("href", `#/shop/${product.id}`);
    }
  });

  it("shows a real price on every card", () => {
    renderShopPage();

    for (const product of shopProducts) {
      const card = screen.getByRole("article", { name: product.name });
      expect(within(card).getByText(/Nu\. [\d,]+ per /)).toBeVisible();
    }
  });

  it("filters the shelf by category", async () => {
    const user = userEvent.setup();
    renderShopPage();

    await user.click(screen.getByRole("button", { name: /^Meal kits$/ }));

    const mealKitCount = shopProducts.filter((product) => product.category === "Meal kits").length;
    expect(screen.getAllByRole("article")).toHaveLength(mealKitCount);
    for (const product of shopProducts) {
      if (product.category === "Meal kits") {
        expect(screen.getByRole("article", { name: product.name })).toBeVisible();
      } else {
        expect(screen.queryByRole("article", { name: product.name })).not.toBeInTheDocument();
      }
    }
  });

  it("adds a product to the shared cart from the shelf", async () => {
    const user = userEvent.setup();
    renderShopPage();

    await user.click(screen.getByRole("button", { name: "Add Grocery Top-Up to cart" }));

    expect(screen.getByRole("status")).toHaveTextContent("Grocery Top-Up added to cart");
  });

  it("shows the curated collection filters alongside categories", () => {
    renderShopPage();

    for (const filter of shopFilters) {
      expect(screen.getByRole("button", { name: filter.label })).toBeVisible();
    }
    expect(screen.getByRole("button", { name: /^Meal kits$/ })).toBeVisible();
  });

  it("filters the shelf by a curated collection", async () => {
    const user = userEvent.setup();
    renderShopPage();

    await user.click(screen.getByRole("button", { name: "Veggies only" }));

    const veggieCount = shopProducts.filter((product) => matchesCollection(product, "veggie")).length;
    expect(screen.getAllByRole("article")).toHaveLength(veggieCount);
    expect(screen.getByRole("article", { name: "Plant-Powered Kit" })).toBeVisible();
    expect(screen.queryByRole("article", { name: "High-Protein Kit" })).not.toBeInTheDocument();
  });

  it("keeps only one filter type active at a time", async () => {
    const user = userEvent.setup();
    renderShopPage();

    await user.click(screen.getByRole("button", { name: /^Meal kits$/ }));
    await user.click(screen.getByRole("button", { name: "Time saver" }));

    expect(screen.getByRole("button", { name: /^Meal kits$/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Time saver" })).toHaveAttribute("aria-pressed", "true");

    const timeSaverCount = shopProducts.filter((product) => matchesCollection(product, "time-saver")).length;
    expect(screen.getAllByRole("article")).toHaveLength(timeSaverCount);
  });

  it("switches back to a category after a collection was active", async () => {
    const user = userEvent.setup();
    renderShopPage();

    await user.click(screen.getByRole("button", { name: "Veggies only" }));
    await user.click(screen.getByRole("button", { name: /^Groceries$/ }));

    expect(screen.getByRole("button", { name: "Veggies only" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /^Groceries$/ })).toHaveAttribute("aria-pressed", "true");

    const groceryCount = shopProducts.filter((product) => product.category === "Groceries").length;
    expect(screen.getAllByRole("article")).toHaveLength(groceryCount);
  });

  it("updates the URL when a collection is selected", async () => {
    const user = userEvent.setup();
    renderShopPage();

    await user.click(screen.getByRole("button", { name: "Top picks" }));

    expect(window.location.hash).toContain("filter=top-pick");
  });

  it("reads an initial collection filter from the URL", () => {
    window.history.replaceState(null, "", "/#/shop?filter=veggie");
    renderShopPage();

    expect(screen.getByRole("button", { name: "Veggies only" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows an empty state and clears an impossible URL combination", async () => {
    window.history.replaceState(null, "", "/#/shop?category=groceries&filter=under-500");
    const user = userEvent.setup();
    renderShopPage();

    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByText("Nothing on the shelf for that combination.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getAllByRole("article")).toHaveLength(shopProducts.length);
  });
});
