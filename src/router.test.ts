import { describe, expect, it } from "vitest";
import { getFarmerId, getRoute } from "./router";

describe("routing", () => {
  it("opens the dedicated coupons page", () => {
    expect(getRoute("#/coupons")).toBe("coupons");
    expect(getRoute("#/coupons?source=account")).toBe("coupons");
  });

  it("opens the Jaggle callback route", () => {
    expect(getRoute("#/auth/jaggle?audience=customer&ticket=abc")).toBe("auth-jaggle");
    expect(getRoute("#/auth/jaggle?audience=admin&ticket=abc")).toBe("auth-jaggle");
  });

  it("opens the dedicated membership account page", () => {
    expect(getRoute("#/account/membership")).toBe("account-membership");
    expect(getRoute("#/account/membership?source=account")).toBe("account-membership");
  });

  it("opens the reset page for an expired recovery response", () => {
    expect(getRoute("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired")).toBe("admin-password-reset");
  });

  it("opens the dedicated partnership enquiry page", () => {
    expect(getRoute("#/partnership")).toBe("partnership");
  });

  it("opens a dedicated farmer profile route", () => {
    expect(getRoute("#/farmers/pema-dorji")).toBe("farmer");
    expect(getFarmerId("#/farmers/pema-dorji")).toBe("pema-dorji");
    expect(getRoute("#/farmers?farmer=pema-dorji")).toBe("farmers");
  });
});
