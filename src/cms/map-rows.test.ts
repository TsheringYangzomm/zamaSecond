import { describe, expect, it } from "vitest";
import { mapProductRow } from "./map-rows";
import type { ProductRow } from "./types";

const product: ProductRow = {
  id: "tomatoes",
  sku: "ZAM-TOMATOES",
  name: "Tomatoes",
  eyebrow: "Local produce",
  description: "Fresh tomatoes.",
  image: "",
  alt: "",
  category: "Vegetables",
  details: {},
  price_amount: 120,
  price_unit: "kg",
  servings: "",
  availability: "In season",
  delivery_estimate: "",
  cooking_time: "",
  ingredients: "",
  allergen_notice: "",
  storage: "",
  source: "",
  nutrition: "",
  tags: [],
  collections: [],
  consultant_note: "",
  dietician_note: "",
  health_benefits: [],
  trust_allergens: [],
  sourcing: "",
  sort_order: 0,
  published: true,
};

describe("mapProductRow", () => {
  it("carries a product seasonal update into the customer product model", () => {
    expect(mapProductRow(product, [], "Fresh harvest available this week.").seasonalUpdate).toBe("Fresh harvest available this week.");
  });
});
