import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import emailjs from "@emailjs/browser";
import { submitLaunchInterest, submitMembershipInterest } from "./launch-interest";
import { getSupabaseClient } from "./supabase";

vi.mock("@emailjs/browser", () => ({
  default: { send: vi.fn() },
}));

vi.mock("./supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

const getSupabaseClientMock = vi.mocked(getSupabaseClient);
const mockSend = vi.mocked(emailjs.send);

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

  it("saves a membership signup through the existing launch-interest table and sends the confirmation email", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("VITE_EMAILJS_SERVICE_ID", "service_zama");
    vi.stubEnv("VITE_EMAILJS_TEMPLATE_ID", "template_contact");
    vi.stubEnv("VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID", "template_autoreply");
    vi.stubEnv("VITE_EMAILJS_PUBLIC_KEY", "public_key");
    mockSend.mockResolvedValue("success" as never);

    const rpc = vi.fn().mockResolvedValue({ data: { status: "ok", submissionId: "member_123" }, error: null });
    mockSupabaseClient(rpc);

    await expect(submitMembershipInterest({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      interests: ["Fresh groceries", "Meal kits"],
    })).resolves.toMatchObject({ mode: "remote" });

    expect(rpc).toHaveBeenCalledWith("create_launch_interest", {
      p_email: "ada@example.com",
      p_source: "membership",
      p_area: null,
      p_full_name: "Ada Lovelace",
      p_items: [{ interest: "Fresh groceries" }, { interest: "Meal kits" }],
    });
    expect(mockSend).toHaveBeenCalledWith(
      "service_zama",
      "template_autoreply",
      expect.objectContaining({
        to_email: "ada@example.com",
        to_name: "Ada Lovelace",
        subject: "You're on the Zama+ update list",
      }),
      { publicKey: "public_key" },
    );
  });

  it("keeps the membership signup when the confirmation email fails", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("VITE_EMAILJS_SERVICE_ID", "service_zama");
    vi.stubEnv("VITE_EMAILJS_TEMPLATE_ID", "template_contact");
    vi.stubEnv("VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID", "template_autoreply");
    vi.stubEnv("VITE_EMAILJS_PUBLIC_KEY", "public_key");
    mockSend.mockRejectedValue(new Error("email failed"));

    const rpc = vi.fn().mockResolvedValue({ data: { status: "ok", submissionId: "member_456" }, error: null });
    mockSupabaseClient(rpc);

    await expect(submitMembershipInterest({
      fullName: "Grace Hopper",
      email: "grace@example.com",
      interests: ["Future Zama+ benefits"],
    })).resolves.toMatchObject({ mode: "remote", emailWasSent: false });
    expect(rpc).toHaveBeenCalledTimes(1);
  });


});
