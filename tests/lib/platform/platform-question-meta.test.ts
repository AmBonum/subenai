import { describe, expect, it } from "vitest";

import { resolvePlatformQuestionMeta } from "@/lib/platform/queries";

describe("resolvePlatformQuestionMeta", () => {
  it("resolves seeded bank UUIDs (hashed and pinned E37) and skips unknown ids", async () => {
    const meta = await resolvePlatformQuestionMeta([
      "d1085207-921d-55e5-b796-ccc9a18f68e5",
      "502fe72e-cb18-504e-aca7-1a1546f587da",
      "00000000-0000-4000-8000-000000000000",
    ]);
    expect(meta.get("d1085207-921d-55e5-b796-ccc9a18f68e5")).toEqual({
      prompt: "DPD ti píše. Akcia?",
      branch_slug: "phishing",
      difficulty: "easy",
    });
    expect(meta.get("502fe72e-cb18-504e-aca7-1a1546f587da")?.branch_slug).toBe("phishing");
    expect(meta.has("00000000-0000-4000-8000-000000000000")).toBe(false);
  });
});
