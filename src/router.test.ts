import { describe, expect, it } from "vitest";
import { getRoute } from "./router";

describe("routing", () => {
  it("opens the dedicated coupons page", () => {
    expect(getRoute("#/coupons")).toBe("coupons");
    expect(getRoute("#/coupons?source=account")).toBe("coupons");
  });

  it("opens the dedicated membership account page", () => {
    expect(getRoute("#/account/membership")).toBe("account-membership");
    expect(getRoute("#/account/membership?source=account")).toBe("account-membership");
  });

  it("opens the dedicated partnership enquiry page", () => {
    expect(getRoute("#/partnership")).toBe("partnership");
  });
});
