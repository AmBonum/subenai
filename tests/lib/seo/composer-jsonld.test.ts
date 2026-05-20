import { describe, it, expect } from "vitest";

import { buildComposerJsonLd } from "@/lib/seo/composer-jsonld";

describe("buildComposerJsonLd — E33 Phase 1 schema.org WebApplication", () => {
  it("emits @type WebApplication with the canonical URL", () => {
    const ld = buildComposerJsonLd({ name: "Composer", description: "x" });
    expect(ld["@type"]).toBe("WebApplication");
    expect(ld.url).toBe("https://subenai.sk/test/builder");
  });

  it("sets isAccessibleForFree + offers.price=0 so Google renders 'Free'", () => {
    const ld = buildComposerJsonLd({ name: "x", description: "x" });
    expect(ld.isAccessibleForFree).toBe(true);
    expect((ld.offers as Record<string, unknown>).price).toBe(0);
    expect((ld.offers as Record<string, unknown>).priceCurrency).toBe("EUR");
  });

  it("declares applicationCategory BusinessApplication + cyber subcategory", () => {
    const ld = buildComposerJsonLd({ name: "x", description: "x" });
    expect(ld.applicationCategory).toBe("BusinessApplication");
    expect(ld.applicationSubCategory).toBe("Cybersecurity training");
  });

  it("hard-codes provider to subenai (first-party tool)", () => {
    const ld = buildComposerJsonLd({ name: "x", description: "x" });
    const provider = ld.provider as Record<string, unknown>;
    expect(provider["@type"]).toBe("Organization");
    expect(provider.name).toBe("subenai");
    expect(provider.url).toBe("https://subenai.sk");
  });

  it("propagates the passed-in name + description verbatim", () => {
    const ld = buildComposerJsonLd({
      name: "Zostav vlastný test pre tím — subenai",
      description: "Test description.",
    });
    expect(ld.name).toBe("Zostav vlastný test pre tím — subenai");
    expect(ld.description).toBe("Test description.");
  });
});
