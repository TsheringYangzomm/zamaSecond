import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CartProvider } from "../cart-provider";
import { ContentProvider } from "../cms/content-context";
import { CustomerAuthProvider } from "../checkout/customer-auth";
import { CartDrawer } from "../components/shop/cart-drawer";
import { CouponsPage } from "./coupons-page";

function renderPage() {
  return render(
    <ContentProvider>
      <CartProvider>
        <CustomerAuthProvider>
          <CouponsPage />
          <CartDrawer />
        </CustomerAuthProvider>
      </CartProvider>
    </ContentProvider>,
  );
}

describe("CouponsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("shows active development coupons to signed-out visitors", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Coupons for your next order" })).toBeVisible();
    expect(await screen.findByText("FRESH10")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Sign in to collect" })).toHaveLength(2);
  });

  it("opens the sign-in panel when a visitor tries to collect", async () => {
    const user = userEvent.setup();
    renderPage();

    const collectButtons = await screen.findAllByRole("button", { name: "Sign in to collect" });
    await user.click(collectButtons[0]);
    expect(screen.getByRole("heading", { name: "Sign in to Zama" })).toBeVisible();
  });
});
