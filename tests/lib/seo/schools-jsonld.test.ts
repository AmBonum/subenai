import { describe, expect, it } from "vitest";

import {
  buildBreadcrumbJsonLd,
  buildSchoolsFaqJsonLd,
  buildSchoolsHowToJsonLd,
  buildSchoolsOrgJsonLd,
} from "@/lib/seo/schools-jsonld";

describe("schools-jsonld builders", () => {
  describe("buildSchoolsFaqJsonLd", () => {
    it("returns a FAQPage with one Question per entry", () => {
      const out = buildSchoolsFaqJsonLd([
        { question: "Q1", answer: "A1" },
        { question: "Q2", answer: "A2" },
      ]);
      expect(out["@context"]).toBe("https://schema.org");
      expect(out["@type"]).toBe("FAQPage");
      const main = out.mainEntity as unknown[];
      expect(main).toHaveLength(2);
      expect(main[0]).toMatchObject({
        "@type": "Question",
        name: "Q1",
        acceptedAnswer: { "@type": "Answer", text: "A1" },
      });
    });

    it("handles empty input", () => {
      const out = buildSchoolsFaqJsonLd([]);
      expect(out.mainEntity).toEqual([]);
    });
  });

  describe("buildSchoolsHowToJsonLd", () => {
    it("returns a HowTo with position-indexed steps", () => {
      const out = buildSchoolsHowToJsonLd("How to", "desc", [
        { name: "step1", text: "do thing 1" },
        { name: "step2", text: "do thing 2" },
      ]);
      expect(out["@type"]).toBe("HowTo");
      expect(out.name).toBe("How to");
      const steps = out.step as Array<{ position: number; name: string }>;
      expect(steps).toHaveLength(2);
      expect(steps[0].position).toBe(1);
      expect(steps[1].position).toBe(2);
    });
  });

  describe("buildSchoolsOrgJsonLd", () => {
    it("emits EducationalOrganization with contactPoint", () => {
      const out = buildSchoolsOrgJsonLd({
        name: "subenai",
        description: "Edu test platform",
        url: "https://subenai.sk",
        logoUrl: "https://subenai.sk/logo.svg",
        contactEmail: "hello@subenai.sk",
      });
      expect(out["@type"]).toBe("EducationalOrganization");
      expect(out.name).toBe("subenai");
      expect(out.logo).toBe("https://subenai.sk/logo.svg");
      const cp = out.contactPoint as { email: string; contactType: string };
      expect(cp.email).toBe("hello@subenai.sk");
      expect(cp.contactType).toBe("customer support");
    });
  });

  describe("buildBreadcrumbJsonLd", () => {
    it("emits BreadcrumbList with sequential position", () => {
      const out = buildBreadcrumbJsonLd([
        { name: "Home", url: "https://x/" },
        { name: "Schools", url: "https://x/schools" },
      ]);
      expect(out["@type"]).toBe("BreadcrumbList");
      const items = out.itemListElement as Array<{ position: number; name: string }>;
      expect(items[0].position).toBe(1);
      expect(items[1].position).toBe(2);
      expect(items[1].name).toBe("Schools");
    });
  });
});
