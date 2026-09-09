import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CartProvider } from "../cart-provider";
import { shopProducts } from "../data/landing";
import { ProductPage } from "./product-page";

function renderProductPage(productId: string | null) {
  return render(
    <CartProvider>
      <ProductPage productId={productId} />
    </CartProvider>,
  );
}

describe("ProductPage", () => {
  it("shows the product details with a real price", () => {
    const product = shopProducts.find((item) => item.id === "meal-kit-box");
    renderProductPage("meal-kit-box");

    expect(screen.getByRole("heading", { name: product?.name, level: 1 })).toBeVisible();
    expect(screen.getByText(product?.description ?? "")).toBeVisible();
    expect(screen.getByText("Nu. 390 per kit")).toBeVisible();

    const mainProductDetails = screen.getByText(product?.sku ?? "").closest("details") as HTMLElement;
    expect(within(mainProductDetails).getByText("Product Details")).toBeVisible();
    expect(within(mainProductDetails).getByText("Product code:")).toBeInTheDocument();
  });

  it("adds the product to the shared cart", async () => {
    const user = userEvent.setup();
    renderProductPage("meal-kit-box");

    await user.click(screen.getByRole("button", { name: "Add Recipe Meal Kit to cart" }));

    expect(screen.getByLabelText("1 in cart")).toBeVisible();
    expect(screen.getByRole("button", { name: "View basket and buy together" })).toBeVisible();
  });

  it("adjusts quantity with the stepper", async () => {
    const user = userEvent.setup();
    renderProductPage("meal-kit-box");

    await user.click(screen.getByRole("button", { name: "Add Recipe Meal Kit to cart" }));
    await user.click(screen.getByRole("button", { name: "Increase Recipe Meal Kit quantity" }));
    expect(screen.getByLabelText("2 in cart")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Decrease Recipe Meal Kit quantity" }));
    expect(screen.getByLabelText("1 in cart")).toBeVisible();
  });

  it("removes the product from the basket", async () => {
    const user = userEvent.setup();
    renderProductPage("meal-kit-box");

    await user.click(screen.getByRole("button", { name: "Add Recipe Meal Kit to cart" }));
    await user.click(screen.getByRole("button", { name: "Remove from basket" }));

    expect(screen.getByRole("button", { name: "Add Recipe Meal Kit to cart" })).toBeVisible();
    expect(screen.queryByLabelText("1 in cart")).not.toBeInTheDocument();
  });

  it("shows related products from the same category", () => {
    renderProductPage("meal-kit-box");

    const related = shopProducts.filter((product) => product.id !== "meal-kit-box" && product.category === "Meal kits");
    for (const product of related) {
      expect(screen.getByRole("article", { name: product.name })).toBeVisible();
    }
  });

  it("shows reviews from previous buyers with a summary rating", () => {
    renderProductPage("meal-kit-box");

    expect(screen.getByRole("heading", { name: "What previous buyers say" })).toBeVisible();
    expect(screen.getByText("Based on 3 reviews")).toBeVisible();
    expect(screen.getByRole("article", { name: "5 star review by Tshewang Dema" })).toBeVisible();
  });

  it("suggests products from other categories in you may also like", () => {
    renderProductPage("meal-kit-box");

    expect(screen.getByRole("heading", { name: "You may also like" })).toBeVisible();
    expect(screen.getByRole("article", { name: "Seasonal Vegetable Box" })).toBeVisible();
  });

  it("renders a not-found fallback for an unknown product", () => {
    renderProductPage("no-such-product");

    expect(screen.getByRole("heading", { name: "That product is not on the shelf." })).toBeVisible();
    expect(screen.getByRole("link", { name: "Browse all products" })).toHaveAttribute("href", "#/shop");
  });
});
