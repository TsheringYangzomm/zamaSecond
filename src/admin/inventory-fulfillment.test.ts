import { describe, expect, it } from "vitest";
import { shortagesMessage } from "./inventory-fulfillment";

describe("inventory fulfillment", () => {
  it("formats a single shortage with the item's unit", () => {
    expect(
      shortagesMessage([
        { itemId: "potato", itemName: "Potato", unit: "kg", required: 2, available: 1.5 },
      ]),
    ).toBe("Not enough Potato available for this order (need 2 kg, have 1.5 kg).");
  });

  it("formats fractional quantities without trailing zeros", () => {
    expect(
      shortagesMessage([
        { itemId: "chilli", itemName: "Chilli", unit: "kg", required: 0.5, available: 0 },
      ]),
    ).toBe("Not enough Chilli available for this order (need 0.5 kg, have 0 kg).");
  });

  it("joins multiple shortages into one message", () => {
    expect(
      shortagesMessage([
        { itemId: "potato", itemName: "Potato", unit: "kg", required: 2, available: 1 },
        { itemId: "carrot", itemName: "Carrot", unit: "kg", required: 1, available: 0.5 },
      ]),
    ).toBe(
      "Not enough Potato available for this order (need 2 kg, have 1 kg). Not enough Carrot available for this order (need 1 kg, have 0.5 kg).",
    );
  });

  it("omits the unit when the item has none", () => {
    expect(
      shortagesMessage([
        { itemId: "oats", itemName: "Oats", unit: "", required: 1, available: 0 },
      ]),
    ).toBe("Not enough Oats available for this order (need 1, have 0).");
  });
});
