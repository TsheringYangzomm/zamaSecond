import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider } from "../../cart-provider";
import { devCoupons } from "../../data/coupons-dev";
import { shopProducts } from "./shop-utils";
import { CheckoutFlow } from "./checkout-flow";

vi.mock("../../checkout/customer-auth", () => ({
  useCustomerAuth: () => ({ status: "signed-out", profile: null, signOut: vi.fn() }),
}));

vi.mock("../../coupons/coupons-api", () => ({
  listMyCoupons: vi.fn(async () => []),
  listPublicCoupons: vi.fn(async () => devCoupons),
  previewCoupon: vi.fn(),
}));

function renderGuestCheckout() {
  const product = shopProducts[0];
  return render(
    <CartProvider>
      <CheckoutFlow
        items={[{ kind: "product", key: product.id, product, quantity: 1 }]}
        subtotal={product.priceAmount ?? 0}
        onBack={vi.fn()}
      />
    </CartProvider>,
  );
}

describe("CheckoutFlow guest savings preview", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("shows public coupons and keeps member-only offers hidden", async () => {
    renderGuestCheckout();

    expect(await screen.findByRole("heading", { name: "See your savings first" })).toBeVisible();
    expect(await screen.findByText("FRESH10")).toBeVisible();
    expect(screen.queryByText("KIT150")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in to redeem points" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Place order/ })).not.toBeInTheDocument();
  });

  it("opens the sign-in step from the locked points card", async () => {
    const user = userEvent.setup();
    renderGuestCheckout();

    await user.click(await screen.findByRole("button", { name: "Sign in to redeem points" }));

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });
});
