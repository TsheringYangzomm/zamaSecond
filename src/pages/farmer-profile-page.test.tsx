import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmerProfilePage } from "./farmer-profile-page";

describe("FarmerProfilePage", () => {
  it("shows a complete farmer profile and links back to the farmers list", () => {
    render(<FarmerProfilePage farmerId="pema-dorji" />);

    expect(screen.getByRole("heading", { name: "Pema Dorji", level: 1 })).toBeVisible();
    expect(screen.getByText("Paro, Bhutan")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Products supplied" })).toBeVisible();
    expect(screen.getByText("Cabbage")).toBeVisible();
    expect(screen.getByText(/terraced fields above Paro/)).toBeVisible();
    expect(screen.getByRole("link", { name: "← Back to all farmers" })).toHaveAttribute("href", "#/farmers");
  });

  it("shows a friendly fallback for an unknown farmer", () => {
    render(<FarmerProfilePage farmerId="missing-farmer" />);

    expect(screen.getByRole("heading", { name: "Farmer profile not found" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to all farmers" })).toHaveAttribute("href", "#/farmers");
  });
});
