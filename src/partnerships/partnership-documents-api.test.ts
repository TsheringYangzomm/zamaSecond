import { describe, expect, it } from "vitest";
import { validatePartnershipDocument } from "./partnership-documents-api";

describe("partnership document validation", () => {
  it("accepts a supported private admin document", () => {
    const agreement = new File(["agreement"], "zama-agreement.pdf", { type: "application/pdf" });
    expect(() => validatePartnershipDocument(agreement)).not.toThrow();
  });

  it("rejects unsupported files and files over the limit", () => {
    const unsupported = new File(["binary"], "installer.exe", { type: "application/octet-stream" });
    const tooLarge = { name: "large.pdf", type: "application/pdf", size: 10 * 1024 * 1024 + 1 } as File;

    expect(() => validatePartnershipDocument(unsupported)).toThrow("PDF, Word, Excel");
    expect(() => validatePartnershipDocument(tooLarge)).toThrow("10 MB");
  });
});
