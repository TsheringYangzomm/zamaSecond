import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HeroSection } from "./hero-section";

describe("HeroSection waitlist", () => {
  it("focuses the email field and explains how to fix an invalid submission", async () => {
    const user = userEvent.setup();
    render(<HeroSection />);

    await user.click(screen.getByRole("button", { name: "Join Launch Updates" }));

    const email = screen.getByRole("textbox", { name: "Email address" });
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Enter your email address");
  });

  it("saves a valid development preview", async () => {
    const user = userEvent.setup();
    render(<HeroSection />);

    await user.type(screen.getByRole("textbox", { name: "Email address" }), "hello@example.com");
    await user.click(screen.getByRole("button", { name: "Join Launch Updates" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Preview saved");
  });
});
