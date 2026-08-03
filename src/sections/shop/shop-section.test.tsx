import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CartProvider } from "../../cart-provider";
import { CartDrawer } from "../../components/shop/cart-drawer";
import { SiteHeader } from "../../components/layout/site-header";
import { ShopSection } from "./shop-section";

function renderShop({ withHeader = false } = {}) {
  return render(
    <CartProvider>
      {withHeader ? <SiteHeader /> : null}
      <ShopSection />
      <CartDrawer />
    </CartProvider>,
  );
}

describe("ShopSection", () => {
  it("keeps the home cards simple and links to the full shop", () => {
    renderShop();

    const groceryCard = screen.getByRole("article", { name: "Grocery Top-Up" });
    expect(groceryCard.querySelector("details")).toBeNull();
    expect(within(groceryCard).getByRole("link", { name: "View details →" })).toHaveAttribute("href", "#/shop/grocery-top-up");

    const featuredCard = screen.getByRole("article", { name: "Seasonal Vegetable Box" });
    expect(featuredCard.querySelector("details")).toBeNull();
    expect(within(featuredCard).getByRole("link", { name: /view full details/i })).toHaveAttribute("href", "#/shop/seasonal-vegetable-box");

    expect(screen.getByRole("link", { name: "View full shop" })).toHaveAttribute("href", "#/shop");
  });

  it("updates the header count and opens the selected items in a cart drawer", async () => {
    const user = userEvent.setup();
    renderShop({ withHeader: true });

    await user.click(screen.getByRole("button", { name: "Add Recipe Meal Kit to cart" }));

    const cartButtons = screen.getAllByRole("button", { name: "Open cart, 1 item" });
    expect(cartButtons.length).toBeGreaterThan(0);
    await user.click(cartButtons[0]);

    const drawer = screen.getByRole("dialog", { name: "Market picks" });
    expect(drawer).toBeVisible();
    expect(within(drawer).getByText("Recipe Meal Kit")).toBeVisible();
    expect(within(drawer).getByLabelText("1 in cart")).toBeVisible();
  });

  it("keeps the cart summary outside the scrollable product list", async () => {
    const user = userEvent.setup();
    renderShop({ withHeader: true });

    await user.click(screen.getByRole("button", { name: "Add Seasonal Vegetable Box to cart" }));
    await user.click(screen.getAllByRole("button", { name: "Open cart, 1 item" })[0]);
    const drawer = screen.getByRole("dialog", { name: "Market picks" });
    const summary = within(drawer).getByText("Nu. 500").closest(".cart-summary-bar");

    expect(summary).toBeVisible();
    expect(summary?.parentElement).toBe(drawer);
  });
});
