import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShopSection } from "./shop-section";

const expectedTiles = [
  { title: "Meal Kits", slug: "meal-kits", count: "4 products" },
  { title: "Groceries", slug: "groceries", count: "3 products" },
  { title: "Vegetables", slug: "vegetables", count: "3 products" },
  { title: "Fruits", slug: "fruits", count: "3 products" },
];

describe("ShopSection", () => {
  it("shows one tile per category linking to the filtered shop", () => {
    render(<ShopSection />);

    for (const tile of expectedTiles) {
      const link = screen.getByRole("link", { name: new RegExp(`^${tile.title},`) });
      expect(link).toHaveAttribute("href", `#/shop/${tile.slug}`);
      expect(link).toHaveTextContent(tile.count);
    }
  });

  it("points the customize-your-box tile to the category page", () => {
    render(<ShopSection />);

    const link = screen.getByRole("link", { name: /^Customize your box,/ });
    expect(link).toHaveAttribute("href", "#/shop/custom-boxes");
    expect(link).not.toHaveTextContent("product");
  });

  it("offers one clear path to the full shop and a separate delivery link", () => {
    render(<ShopSection />);

    const fullShopLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === "#/shop");
    expect(fullShopLinks.map((link) => link.textContent?.trim())).toEqual(["View full shop"]);

    expect(screen.getByRole("link", { name: /delivery details/i })).toHaveAttribute("href", "#delivery");
  });

  it("keeps the launch section free of product cards and add-to-cart buttons", () => {
    render(<ShopSection />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("article")).toBeNull();
  });
});
