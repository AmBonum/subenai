import { describe, expect, it } from "vitest";

import { parseDocBody } from "@/lib/docs/doc-body";

describe("parseDocBody", () => {
  it("returns a single markdown block when there is no shortcode", () => {
    expect(parseDocBody("Prvý odsek.\n\nDruhý odsek.")).toEqual([
      { kind: "md", text: "Prvý odsek.\n\nDruhý odsek." },
    ]);
  });

  it("splits a scene shortcode line out between markdown runs", () => {
    const blocks = parseDocBody("Úvod.\n\n[[scene3d:campaign-flow]]\n\n## Krok 1");
    expect(blocks).toEqual([
      { kind: "md", text: "Úvod." },
      { kind: "scene3d", name: "campaign-flow" },
      { kind: "md", text: "## Krok 1" },
    ]);
  });

  it("reads an optional caption after the pipe", () => {
    expect(parseDocBody("[[scene3d:evidence-report|Doklad s pečaťou]]")).toEqual([
      { kind: "scene3d", name: "evidence-report", caption: "Doklad s pečaťou" },
    ]);
  });

  it("keeps unknown scene names and inline mentions as markdown", () => {
    const body = "[[scene3d:unknown]]\nText [[scene3d:scam-phone]] inline.";
    expect(parseDocBody(body)).toEqual([{ kind: "md", text: body }]);
  });
});
