import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FarmersSection } from "./farmers-section";

describe("FarmersSection", () => {
  it("lets people move between farmer story chapters", async () => {
    const user = userEvent.setup();
    render(<FarmersSection />);

    expect(screen.getByRole("heading", { name: "Who grew it?", level: 4 })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Next →" }));
    expect(screen.getByRole("heading", { name: "What is in season?", level: 4 })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /How did it reach the box\?/ }));
    expect(screen.getByRole("heading", { name: "How did it reach the box?", level: 4 })).toBeVisible();
  });
});
