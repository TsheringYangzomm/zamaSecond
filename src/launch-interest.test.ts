import { afterEach, describe, expect, it, vi } from "vitest";
import { submitLaunchInterest } from "./launch-interest";

describe("submitLaunchInterest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("stores a development preview when no endpoint is configured", async () => {
    vi.stubEnv("VITE_LAUNCH_INTEREST_ENDPOINT", "");

    await expect(submitLaunchInterest({ email: "hello@example.com", source: "hero-waitlist" })).resolves.toEqual({ mode: "preview" });
    expect(sessionStorage.getItem("zama-launch-interest-preview")).toContain("hello@example.com");
  });

  it("returns the remote submission id from a successful endpoint", async () => {
    vi.stubEnv("VITE_LAUNCH_INTEREST_ENDPOINT", "https://api.zama.bt/v1/launch-interests");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ submissionId: "lead_123" }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(submitLaunchInterest({ email: "hello@example.com", source: "hero-waitlist" })).resolves.toEqual({
      mode: "remote",
      submissionId: "lead_123",
    });
  });

  it("provides a useful retry message when the endpoint rate-limits", async () => {
    vi.stubEnv("VITE_LAUNCH_INTEREST_ENDPOINT", "https://api.zama.bt/v1/launch-interests");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));

    await expect(submitLaunchInterest({ email: "hello@example.com", source: "hero-waitlist" })).rejects.toThrow("Wait a moment");
  });
});
