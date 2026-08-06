import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FarmersSection } from "./farmers-section";

describe("FarmersSection", () => {
  it("renders the section heading", () => {
    render(<FarmersSection />);
    expect(screen.getByRole("heading", { name: /Real people behind every ingredient/ })).toBeVisible();
  });

  it("renders three farmer cards", () => {
    render(<FarmersSection />);
    expect(screen.getByText("Pema Dorji")).toBeVisible();
    expect(screen.getByText("Yeshey Wangmo")).toBeVisible();
    expect(screen.getByText("Tashi Phuntsho")).toBeVisible();
  });

  it("includes a link to the farmers page", () => {
    render(<FarmersSection />);
    expect(screen.getByRole("link", { name: /View all farmers/ })).toHaveAttribute("href", "#/farmers");
  });
});
