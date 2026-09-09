import { describe, expect, it } from "vitest";
import { buildJaggleAuthorizationUrl, getJaggleCallbackUrl } from "./jaggle-sso";

describe("Jaggle SSO client", () => {
  it("builds an authorization URL with an exact audience callback", () => {
    const url = new URL(buildJaggleAuthorizationUrl("customer", "client id", "https://zama.bt"));
    expect(url.origin).toBe("https://accounts.jaggle.ai");
    expect(url.pathname).toBe("/api/v1/sso/authorize");
    expect(url.searchParams.get("client_id")).toBe("client id");
    expect(url.searchParams.get("redirect")).toBe("https://zama.bt/api/jaggle-customer-callback");
  });

  it("keeps customer and admin callbacks separate", () => {
    expect(getJaggleCallbackUrl("customer", "https://zama.bt")).toContain("jaggle-customer-callback");
    expect(getJaggleCallbackUrl("admin", "https://zama.bt")).toContain("jaggle-admin-callback");
  });
});
