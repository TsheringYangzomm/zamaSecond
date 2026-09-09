import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroSection } from "./hero-section";
import { submitLaunchInterest } from "../../launch-interest";

vi.mock("../../launch-interest", () => ({
  submitLaunchInterest: vi.fn(),
}));

const submitLaunchInterestMock = vi.mocked(submitLaunchInterest);

describe("HeroSection waitlist", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("focuses the email field and explains how to fix an invalid submission", async () => {
    const user = userEvent.setup();
    render(<HeroSection />);

    await user.click(screen.getByRole("button", { name: "Join Launch Updates" }));

    const email = screen.getByRole("textbox", { name: "Email address" });
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Enter your email address");
  });

  it("pops up a preview notice for a valid development submission", async () => {
    submitLaunchInterestMock.mockResolvedValue({ mode: "preview" });
    const user = userEvent.setup();
    render(<HeroSection />);

    await user.type(screen.getByRole("textbox", { name: "Email address" }), "hello@example.com");
    await user.click(screen.getByRole("button", { name: "Join Launch Updates" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Preview saved");
  });

  it("pops up a confirmation when the registration is saved", async () => {
    submitLaunchInterestMock.mockResolvedValue({ mode: "remote", submissionId: "lead_123" });
    const user = userEvent.setup();
    render(<HeroSection />);

    await user.type(screen.getByRole("textbox", { name: "Email address" }), "hello@example.com");
    await user.click(screen.getByRole("button", { name: "Join Launch Updates" }));

    expect(await screen.findByRole("status")).toHaveTextContent("on the list");
  });

  it("pops up a notice for someone already on the list", async () => {
    submitLaunchInterestMock.mockResolvedValue({ mode: "duplicate" });
    const user = userEvent.setup();
    render(<HeroSection />);

    await user.type(screen.getByRole("textbox", { name: "Email address" }), "hello@example.com");
    await user.click(screen.getByRole("button", { name: "Join Launch Updates" }));

    expect(await screen.findByRole("status")).toHaveTextContent("already on the list");
  });

  it("keeps the confirmation toast visible until the user closes it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    submitLaunchInterestMock.mockResolvedValue({ mode: "remote", submissionId: "lead_123" });
    const user = userEvent.setup();
    render(<HeroSection />);

    await user.type(screen.getByRole("textbox", { name: "Email address" }), "hello@example.com");
    await user.click(screen.getByRole("button", { name: "Join Launch Updates" }));

    expect(await screen.findByRole("status")).toHaveTextContent("on the list");

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent("on the list");

    await user.click(screen.getByRole("button", { name: "Close notification" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
