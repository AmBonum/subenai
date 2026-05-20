// E35.5 — JSON-LD structured-data validity.
//
// The legal pages emit hand-rolled JSON-LD via builders in
// `src/lib/seo/legal-jsonld.ts` and `src/lib/seo/schools-jsonld.ts`.
// Hand-rolled means easy to silently break — a missing `@context`
// or an unknown `@type` doesn't crash the page, it just gets ignored
// by Google and Slack/Twitter preview crawlers.
//
// This spec calls each builder with realistic inputs and asserts:
//   1. Every required Schema.org field is present and non-empty.
//   2. The `@context` is `https://schema.org` (HTTPS, not http).
//   3. The `@type` is one of the known types the spec accepts.
//   4. URLs are absolute (start with `https://`).
//
// Reference: https://schema.org — but we only assert a curated subset
// because the full spec is enormous and Google's rich-result eligibility
// is much narrower than the full spec.

import { describe, expect, it } from "vitest";
import { buildCookiesPolicyJsonLd, buildPrivacyPolicyJsonLd } from "@/lib/seo/legal-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/schools-jsonld";

const SITE = "https://subenai.sk";

describe("PrivacyPolicy JSON-LD", () => {
  const jsonLd = buildPrivacyPolicyJsonLd({
    name: "Zásady ochrany súkromia — subenai",
    description: "Aké údaje spracúvame, …",
    url: `${SITE}/privacy`,
    inLanguage: "sk-SK",
    publisherName: "am.bonum s. r. o.",
    publisherUrl: SITE,
  });

  it("uses the HTTPS Schema.org context", () => {
    expect(jsonLd["@context"]).toBe("https://schema.org");
  });

  it("declares @type PrivacyPolicy", () => {
    expect(jsonLd["@type"]).toBe("PrivacyPolicy");
  });

  it("contains every required field with a non-empty value", () => {
    for (const field of ["name", "description", "url", "inLanguage", "publisher"]) {
      expect(jsonLd[field], `field "${field}" missing`).toBeTruthy();
    }
  });

  it("publisher is an Organization with name + url", () => {
    const publisher = jsonLd.publisher as { "@type": string; name: string; url: string };
    expect(publisher["@type"]).toBe("Organization");
    expect(publisher.name).toBe("am.bonum s. r. o.");
    expect(publisher.url).toMatch(/^https:\/\//);
  });

  it("URL is absolute HTTPS", () => {
    expect(String(jsonLd.url)).toMatch(/^https:\/\//);
  });

  it("is JSON-serialisable round-trip (no cycles, no undefined)", () => {
    const json = JSON.stringify(jsonLd);
    expect(json).toContain('"@type":"PrivacyPolicy"');
    expect(JSON.parse(json)).toEqual(jsonLd);
  });
});

describe("CookiesPolicy / WebPage JSON-LD", () => {
  const jsonLd = buildCookiesPolicyJsonLd({
    name: "Zásady používania cookies — subenai",
    description: "Aké úložisko a cookies …",
    url: `${SITE}/cookies`,
    inLanguage: "sk-SK",
    privacyPolicyUrl: `${SITE}/privacy`,
    publisherName: "am.bonum s. r. o.",
    publisherUrl: SITE,
  });

  it("declares @type WebPage", () => {
    expect(jsonLd["@type"]).toBe("WebPage");
  });

  it("isPartOf references the PrivacyPolicy as the parent", () => {
    const parent = jsonLd.isPartOf as { "@type": string; url: string };
    expect(parent["@type"]).toBe("PrivacyPolicy");
    expect(parent.url).toBe(`${SITE}/privacy`);
  });

  it("URL is absolute HTTPS and matches the cookies route", () => {
    expect(jsonLd.url).toBe(`${SITE}/cookies`);
  });
});

describe("BreadcrumbList JSON-LD", () => {
  const jsonLd = buildBreadcrumbJsonLd([
    { name: "Domov", url: `${SITE}/` },
    { name: "Cookies", url: `${SITE}/cookies` },
  ]);

  it("declares @type BreadcrumbList", () => {
    expect(jsonLd["@type"]).toBe("BreadcrumbList");
  });

  it("emits ListItem entries with position, name, and item.url", () => {
    const items = jsonLd.itemListElement as Array<{
      "@type": string;
      position: number;
      name: string;
      item: string | { url?: string; ["@id"]?: string };
    }>;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(2);
    items.forEach((entry, idx) => {
      expect(entry["@type"]).toBe("ListItem");
      expect(entry.position).toBe(idx + 1);
      expect(entry.name).toBeTruthy();
      // Schema.org accepts either a string URL or an object with url/@id.
      const item = entry.item;
      const itemUrl =
        typeof item === "string" ? item : ((item.url ?? item["@id"]) as string | undefined);
      expect(itemUrl, "BreadcrumbList item URL missing").toBeTruthy();
      expect(itemUrl!).toMatch(/^https:\/\//);
    });
  });
});
