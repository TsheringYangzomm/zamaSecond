import { describe, expect, it } from "vitest";
import { slugify, waitlistToCsv, type WaitlistEntry } from "./admin-api";

const sample: WaitlistEntry[] = [
  {
    id: 1,
    email: "a@example.com",
    source: "hero-waitlist",
    area: "Thimphu",
    full_name: "Ada Lovelace",
    items: null,
    created_at: "2026-08-01T10:00:00Z",
  },
  {
    id: 2,
    email: 'weird"email@example.com',
    source: "launch-basket",
    area: "",
    full_name: null,
    items: [{ sku: "vb-1", quantity: 2 }],
    created_at: "2026-08-02T09:30:00Z",
  },
];

describe("waitlistToCsv", () => {
  it("writes a header row followed by one row per entry", () => {
    const csv = waitlistToCsv(sample);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("id,email,source,area,full_name,items,created_at");
    expect(lines[1]).toContain("a@example.com");
    expect(lines[1]).toContain("Thimphu");
  });

  it("quotes fields that contain commas or quotes", () => {
    const csv = waitlistToCsv([sample[1]]);
    expect(csv).toContain('"weird""email@example.com"');
    expect(csv).toContain('"[{""sku"":""vb-1"",""quantity"":2}]"');
  });

  it("renders an empty area and null items as empty quoted cells", () => {
    const csv = waitlistToCsv([sample[1]]);
    expect(csv).toContain('"","');
  });
});

describe("slugify", () => {
  it("lowercases and joins words with dashes", () => {
    expect(slugify("Fresh Veggie Box")).toBe("fresh-veggie-box");
  });

  it("strips apostrophes and quotes", () => {
    expect(slugify("Pema's Datshi 'kit'")).toBe("pemas-datshi-kit");
  });

  it("collapses whitespace and punctuation", () => {
    expect(slugify("  Punakha  Greens!  ")).toBe("punakha-greens");
  });

  it("falls back for an empty or non-latin name", () => {
    expect(slugify("   ")).toBe("item");
    expect(slugify("")).toBe("item");
    expect(slugify("ཨང་གྲངས")).toBe("item");
  });

  it("caps the slug length", () => {
    expect(slugify("a".repeat(200))).toHaveLength(60);
  });
});
