import { afterEach, describe, expect, it, vi } from "vitest";
import emailjs from "@emailjs/browser";
import { submitContactMessage } from "./contact";

vi.mock("@emailjs/browser", () => ({
  default: { send: vi.fn() },
}));

const mockInsert = vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: null, error: null }) });
vi.mock("./supabase", () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  })),
}));

const mockSend = vi.mocked(emailjs.send);

describe("submitContactMessage", () => {
  afterEach(() => {
    mockSend.mockReset();
    mockInsert.mockReset();
    mockInsert.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: null, error: null }) });
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("stores a development preview when EmailJS is not configured", async () => {
    vi.stubEnv("VITE_EMAILJS_SERVICE_ID", "");
    vi.stubEnv("VITE_EMAILJS_TEMPLATE_ID", "");
    vi.stubEnv("VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID", "");
    vi.stubEnv("VITE_EMAILJS_PUBLIC_KEY", "");

    await expect(
      submitContactMessage({ name: "Demo", email: "hello@example.com", topic: "question", message: "Do you deliver to Babesa?" }),
    ).resolves.toEqual({ mode: "preview" });
    expect(sessionStorage.getItem("zama-contact-message-preview")).toContain("hello@example.com");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends the message through EmailJS when configured", async () => {
    vi.stubEnv("VITE_EMAILJS_SERVICE_ID", "service_zama");
    vi.stubEnv("VITE_EMAILJS_TEMPLATE_ID", "template_contact");
    vi.stubEnv("VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID", "template_autoreply");
    vi.stubEnv("VITE_EMAILJS_PUBLIC_KEY", "public_key");
    mockSend.mockResolvedValue({ status: 200, text: "OK" });

    await expect(
      submitContactMessage({ name: "Demo", email: "hello@example.com", topic: "feedback", message: "Love the boxes." }),
    ).resolves.toEqual({ mode: "remote" });
    expect(mockSend).toHaveBeenCalledWith(
      "service_zama",
      "template_contact",
      {
        subject: "New Zama message — Feedback",
        name: "Demo",
        time: expect.any(String),
        topic: "Feedback",
        message: "Love the boxes.",
        email: "hello@example.com",
      },
      { publicKey: "public_key" },
    );
    expect(mockSend).toHaveBeenCalledWith(
      "service_zama",
      "template_autoreply",
      {
        to_email: "hello@example.com",
        to_name: "Demo",
        reply_to: "hello@example.com",
        subject: "Thanks for writing to Zama",
        name: "Demo",
        time: expect.any(String),
        topic: "Feedback",
        message: "Love the boxes.",
        email: "hello@example.com",
      },
      { publicKey: "public_key" },
    );
  });

  it("still reports success when the auto-reply fails but the notification is sent", async () => {
    vi.stubEnv("VITE_EMAILJS_SERVICE_ID", "service_zama");
    vi.stubEnv("VITE_EMAILJS_TEMPLATE_ID", "template_contact");
    vi.stubEnv("VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID", "template_autoreply");
    vi.stubEnv("VITE_EMAILJS_PUBLIC_KEY", "public_key");
    mockSend
      .mockResolvedValueOnce({ status: 200, text: "OK" })
      .mockRejectedValueOnce({ status: 500, text: "Gmail_API: recipient refused" });

    await expect(
      submitContactMessage({ name: "Demo", email: "hello@example.com", topic: "question", message: "Hello" }),
    ).resolves.toEqual({ mode: "remote" });
  });

  it("reports success even when EmailJS rejects the request", async () => {
    vi.stubEnv("VITE_EMAILJS_SERVICE_ID", "service_zama");
    vi.stubEnv("VITE_EMAILJS_TEMPLATE_ID", "template_contact");
    vi.stubEnv("VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID", "template_autoreply");
    vi.stubEnv("VITE_EMAILJS_PUBLIC_KEY", "public_key");
    mockSend.mockRejectedValue({ status: 429, text: "Too Many Requests" });

    await expect(
      submitContactMessage({ name: "Demo", email: "hello@example.com", topic: "support", message: "Help" }),
    ).resolves.toEqual({ mode: "remote" });
  });
});
