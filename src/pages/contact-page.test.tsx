import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import emailjs from "@emailjs/browser";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactPage } from "./contact-page";

vi.mock("@emailjs/browser", () => ({
  default: { send: vi.fn() },
}));

const mockSend = vi.mocked(emailjs.send);

describe("ContactPage form", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_EMAILJS_SERVICE_ID", "");
    vi.stubEnv("VITE_EMAILJS_TEMPLATE_ID", "");
    vi.stubEnv("VITE_EMAILJS_PUBLIC_KEY", "");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("focuses the email field and explains how to fix an invalid submission", async () => {
    const user = userEvent.setup();
    render(<ContactPage />);

    await user.click(screen.getByRole("button", { name: "Send message" }));

    const email = screen.getByRole("textbox", { name: /email address/i });
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Enter your email address");
  });

  it("saves a valid development preview when EmailJS is not configured", async () => {
    const user = userEvent.setup();
    render(<ContactPage />);

    await user.type(screen.getByRole("textbox", { name: /email address/i }), "hello@example.com");
    await user.type(screen.getByRole("textbox", { name: /message/i }), "Do you deliver to Babesa?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Preview saved");
    expect(mockSend).not.toHaveBeenCalled();
  });
});
