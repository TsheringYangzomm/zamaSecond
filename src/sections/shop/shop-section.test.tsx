import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CartProvider } from "../../cart-provider";
import { SiteHeader } from "../../components/layout/site-header";
import { ShopSection } from "./shop-section";

function renderShop({ withHeader = false } = {}) {
  return render(
    <CartProvider>
      {withHeader ? <SiteHeader /> : null}
      <ShopSection />
    </CartProvider>,
  );
}

describe("ShopSection", () => {
  it("keeps product details independently expandable", async () => {
    const user = userEvent.setup();
    renderShop();
    const groceryCard = screen.getByRole("article", { name: "Grocery Top-Up" });
    const details = groceryCard.querySelector("details");

    expect(details).not.toHaveAttribute("open");
    await user.click(within(groceryCard).getByText("Product Details"));
    expect(details).toHaveAttribute("open");
    expect(within(groceryCard).getByText(/Product code:/)).toBeVisible();
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
    const summary = within(drawer).getByText("Pricing pending").closest(".cart-summary-bar");

    expect(summary).toBeVisible();
    expect(summary?.parentElement).toBe(drawer);
  });
});
