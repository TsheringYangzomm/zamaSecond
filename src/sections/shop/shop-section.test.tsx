import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ShopSection } from "./shop-section";

describe("ShopSection", () => {
  it("keeps product details independently expandable", async () => {
    const user = userEvent.setup();
    render(<ShopSection />);
    const groceryCard = screen.getByRole("article", { name: "Grocery Top-Up" });
    const details = groceryCard.querySelector("details");

    expect(details).not.toHaveAttribute("open");
    await user.click(within(groceryCard).getByText("Product Details"));
    expect(details).toHaveAttribute("open");
    expect(within(groceryCard).getByText(/Product code:/)).toBeVisible();
  });

  it("adds a product to the launch picks and announces the count", async () => {
    const user = userEvent.setup();
    render(<ShopSection />);

    await user.click(screen.getByRole("button", { name: "Save Recipe Meal Kit for launch" }));

    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "1 item saved")).toBeVisible();
    expect(screen.getByText("Recipe Meal Kit", { selector: "p" })).toBeVisible();
  });

  it("keeps submit enabled and focuses the first missing requirement", async () => {
    const user = userEvent.setup();
    render(<ShopSection />);
    const submit = screen.getByRole("button", { name: "Save My Launch Picks" });

    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(screen.getByText("Save at least 1 product for launch, then submit your picks again.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save Seasonal Vegetable Box for launch" })).toHaveFocus();
  });
});
