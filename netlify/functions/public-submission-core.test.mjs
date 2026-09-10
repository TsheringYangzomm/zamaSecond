import { afterEach, describe, expect, it, vi } from "vitest";
import { handlePublicSubmission } from "./public-submission-core.mjs";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("public submission boundary", () => {
  it("rejects methods other than POST", async () => {
    const result = await handlePublicSubmission({ httpMethod: "GET" }, "contact");
    expect(result.statusCode).toBe(405);
    expect(JSON.parse(result.body)).toMatchObject({ code: "method_not_allowed" });
  });

  it("rejects malformed and oversized payloads before provider access", async () => {
    const malformed = await handlePublicSubmission({ httpMethod: "POST", body: "{" }, "launch-interest");
    const oversized = await handlePublicSubmission({ httpMethod: "POST", body: "x".repeat(50_001) }, "contact");
    expect(malformed.statusCode).toBe(400);
    expect(oversized.statusCode).toBe(413);
  });

  it("requires a valid Turnstile response when bot protection is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 })));

    const result = await handlePublicSubmission({
      httpMethod: "POST",
      body: JSON.stringify({ email: "person@example.com", topic: "question", message: "Hello", turnstileToken: "bad-token" }),
      headers: {},
    }, "contact");

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toMatchObject({ code: "bot_check_failed" });
  });

  it("returns a stable unavailable code when server credentials are absent", async () => {
    const result = await handlePublicSubmission({
      httpMethod: "POST",
      body: JSON.stringify({ email: "person@example.com", source: "hero-waitlist" }),
      headers: {},
    }, "launch-interest");
    expect(result.statusCode).toBe(503);
    expect(JSON.parse(result.body)).toMatchObject({ code: "service_unavailable" });
  });
});
