import { describe, expect, it } from "vitest";
import { getRoute } from "./router";

describe("routing", () => {
  it("opens the dedicated coupons page", () => {
    expect(getRoute("#/coupons")).toBe("coupons");
    expect(getRoute("#/coupons?source=account")).toBe("coupons");
  });
});
