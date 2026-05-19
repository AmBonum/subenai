import { describe, it, expect } from "vitest";
import { buildPackQuizJsonLd, INDUSTRY_LABEL } from "@/lib/seo/quiz-jsonld";
import type { TestPack } from "@/content/test-packs";

const fixture: TestPack = {
  slug: "fixture-pack",
  title: "Fixture pack",
  tagline: "Krátky popis pre SEO test.",
  industry: "eshop",
  industryEmoji: "🛒",
  targetPersona: "Test persona.",
  questionIds: ["a", "b", "c", "d", "e", "f", "g", "h"],
  passingThreshold: 70,
  publishedAt: "2026-04-27",
  updatedAt: "2026-04-27",
};

describe("buildPackQuizJsonLd", () => {
  it("returns a Schema.org Quiz object with required fields", () => {
    const json = buildPackQuizJsonLd(fixture);
    expect(json["@context"]).toBe("https://schema.org");
    expect(json["@type"]).toBe("Quiz");
    expect(json.name).toBe(fixture.title);
    expect(json.description).toBe(fixture.tagline);
    expect(json.inLanguage).toBe("sk-SK");
    expect(json.isAccessibleForFree).toBe(true);
    expect(json.educationalLevel).toBe("vocational");
  });

  it("uses the localized industry label", () => {
    const json = buildPackQuizJsonLd(fixture);
    expect(json.about).toBe(INDUSTRY_LABEL.eshop);
  });

  it("URL points at canonical /tests/<slug>", () => {
    const json = buildPackQuizJsonLd(fixture);
    expect(json.url).toBe("https://subenai.sk/tests/fixture-pack");
  });

  it("numberOfQuestions matches questionIds length", () => {
    expect(
      buildPackQuizJsonLd({ ...fixture, questionIds: Array(12).fill("x") }).numberOfQuestions,
    ).toBe(12);
  });

  it("INDUSTRY_LABEL covers all enum values", () => {
    const industries: TestPack["industry"][] = [
      "eshop",
      "gastro",
      "autoservis",
      "it",
      "verejne_sluzby",
      "dispecing",
      "doprava",
      "marketing",
      "zdravotnictvo",
      "skoly",
      "strojova_vyroba",
      "pneuservis",
      "sme_ucto",
      "horeca",
      "servis",
    ];
    for (const i of industries) {
      expect(INDUSTRY_LABEL[i], `missing label for ${i}`).toBeTruthy();
    }
  });

  it("serializes cleanly to JSON", () => {
    const str = JSON.stringify(buildPackQuizJsonLd(fixture));
    expect(() => JSON.parse(str)).not.toThrow();
  });
});
