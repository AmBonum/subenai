import { describe, expect, it } from "vitest";

import { buildFaqJsonLd } from "@/lib/seo/faq-jsonld";

describe("buildFaqJsonLd", () => {
  it("returns a FAQPage @type with the schema.org context", () => {
    const out = buildFaqJsonLd([{ question: "Q?", answer: "A." }]);
    expect(out["@context"]).toBe("https://schema.org");
    expect(out["@type"]).toBe("FAQPage");
  });

  it("maps each entry into a Question + Answer pair", () => {
    const entries = [
      { question: "Je to seriózne?", answer: "Áno, podľa reálnych vzorcov." },
      { question: "Dá sa to podvádzať?", answer: "Skús — beží časomiera." },
    ];
    const out = buildFaqJsonLd(entries);
    const mainEntity = out.mainEntity as Array<Record<string, unknown>>;
    expect(mainEntity).toHaveLength(2);
    expect(mainEntity[0]).toEqual({
      "@type": "Question",
      name: "Je to seriózne?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Áno, podľa reálnych vzorcov.",
      },
    });
  });

  it("preserves Slovak diacritics in the JSON-LD output", () => {
    const out = buildFaqJsonLd([
      { question: "Aké údaje ukladáte?", answer: "Iba odpovede a skóre — anonymne." },
    ]);
    const json = JSON.stringify(out);
    expect(json).toContain("Aké údaje ukladáte?");
    expect(json).toContain("anonymne");
  });

  it("handles an empty entries array gracefully", () => {
    const out = buildFaqJsonLd([]);
    expect(out.mainEntity).toEqual([]);
  });
});
