import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { submitLaunchInterest } from "./launch-interest";
import { getSupabaseClient } from "./supabase";

vi.mock("./supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

const getSupabaseClientMock = vi.mocked(getSupabaseClient);

function mockSupabaseClient(rpc: ReturnType<typeof vi.fn>) {
  getSupabaseClientMock.mockReturnValue({ rpc } as unknown as SupabaseClient);
}

describe("submitLaunchInterest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("stores a development preview when no endpoint or Supabase is configured", async () => {
    vi.stubEnv("VITE_LAUNCH_INTEREST_ENDPOINT", "");
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

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

  it("saves through Supabase and returns the remote submission id", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    const rpc = vi.fn().mockResolvedValue({ data: { status: "ok", submissionId: "lead_123" }, error: null });
    mockSupabaseClient(rpc);

    await expect(submitLaunchInterest({ email: "Hello@Example.com", source: "hero-waitlist", area: "Thimphu" })).resolves.toEqual({
      mode: "remote",
      submissionId: "lead_123",
    });
    expect(rpc).toHaveBeenCalledWith("create_launch_interest", {
      p_email: "Hello@Example.com",
      p_source: "hero-waitlist",
      p_area: "Thimphu",
      p_items: null,
    });
  });

  it("reports a duplicate email from Supabase without re-registering", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    const rpc = vi.fn().mockResolvedValue({ data: { status: "duplicate" }, error: null });
    mockSupabaseClient(rpc);

    await expect(submitLaunchInterest({ email: "hello@example.com", source: "hero-waitlist" })).resolves.toEqual({ mode: "duplicate" });
  });

  it("fails with a useful message when Supabase rejects the email as invalid", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    const rpc = vi.fn().mockResolvedValue({ data: { status: "invalid_email" }, error: null });
    mockSupabaseClient(rpc);

    await expect(submitLaunchInterest({ email: "not-an-email", source: "hero-waitlist" })).rejects.toThrow("could not save");
  });

  it("fails with a useful message when the Supabase request errors", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    mockSupabaseClient(rpc);

    await expect(submitLaunchInterest({ email: "hello@example.com", source: "hero-waitlist" })).rejects.toThrow("could not save");
  });
});
