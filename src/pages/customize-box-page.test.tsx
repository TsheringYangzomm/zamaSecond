import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider } from "../cart-provider";
import { useCart } from "../cart-context";
import { resetInventoryCatalog } from "../checkout/inventory-catalog";
import { itemInventoryDevData } from "../data/commerce-dev";
import { CustomizeBoxPage } from "./customize-box-page";

vi.mock("../supabase", () => ({
  getSupabaseClient: () => null,
}));

const devItems = Object.entries(itemInventoryDevData).map(([id, row]) => ({ id, ...row }));

function CartProbe() {
  const { cart, isCartOpen } = useCart();
  return <div data-testid="cart-probe">{JSON.stringify({ cart, isCartOpen })}</div>;
}

function renderPage() {
  return render(
    <CartProvider>
      <CustomizeBoxPage />
      <CartProbe />
    </CartProvider>,
  );
}

beforeEach(() => {
  resetInventoryCatalog();
});

describe("CustomizeBoxPage", () => {
  it("lists every stockable item with a quantity stepper", async () => {
    renderPage();

    expect(await screen.findByRole("article", { name: "Potato" })).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(devItems.length);
    expect(screen.getByRole("button", { name: "Increase Potato quantity" })).toBeVisible();
  });

  it("lets the user pick quantities and add the whole box to the basket", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("article", { name: "Potato" });

    await user.click(screen.getByRole("button", { name: "Increase Potato quantity" }));
    await user.click(screen.getByRole("button", { name: "Increase Potato quantity" }));
    await user.click(screen.getByRole("button", { name: "Increase Carrot quantity" }));

    expect(screen.getByLabelText("2 Potato in box")).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: /Add 3 items to basket/ }));

    expect(screen.getByTestId("cart-probe")).toHaveTextContent('"cart":{"custom-box:potato":2,"custom-box:carrot":1}');
    expect(screen.getByTestId("cart-probe")).toHaveTextContent('"isCartOpen":true');
    expect(screen.getByRole("status")).toHaveTextContent("3 items added to your box.");
  });

  it("disables quantity increases for out-of-stock items", async () => {
    renderPage();

    await screen.findByRole("article", { name: "Chips" });

    expect(screen.getByRole("button", { name: "Increase Chips quantity" })).toBeDisabled();
    expect(screen.getByText("Back soon")).toBeVisible();
  });

  it("filters the shelf by category", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("article", { name: "Potato" });

    await user.click(screen.getByRole("button", { name: "Pantry" }));

    expect(screen.getByRole("article", { name: "Brown Rice" })).toBeVisible();
    expect(screen.queryByRole("article", { name: "Potato" })).not.toBeInTheDocument();
  });
});
