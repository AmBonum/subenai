import { describe, it, expect } from "vitest";

import { TESTS_FAQ_KEYS, buildTestsFaqJsonLd, type TestsFaqKey } from "@/lib/seo/tests-faq-schema";

const fakeQ = (key: TestsFaqKey) => `Q-${key}`;
const fakeA = (key: TestsFaqKey) => `A-${key}`;

describe("buildTestsFaqJsonLd — E25 Phase 1 FAQPage schema", () => {
  it("emits @context + @type as FAQPage", () => {
    const ld = buildTestsFaqJsonLd(fakeQ, fakeA);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("FAQPage");
  });

  it("emits one Question per registered key", () => {
    const ld = buildTestsFaqJsonLd(fakeQ, fakeA);
    const items = ld.mainEntity as Array<Record<string, unknown>>;
    expect(items).toHaveLength(TESTS_FAQ_KEYS.length);
    items.forEach((item, idx) => {
      expect(item["@type"]).toBe("Question");
      expect(item.name).toBe(`Q-${TESTS_FAQ_KEYS[idx]}`);
    });
  });

  it("wraps each answer in an Answer subtype with the resolved text", () => {
    const ld = buildTestsFaqJsonLd(fakeQ, fakeA);
    const items = ld.mainEntity as Array<{ acceptedAnswer: Record<string, unknown> }>;
    items.forEach((item, idx) => {
      expect(item.acceptedAnswer["@type"]).toBe("Answer");
      expect(item.acceptedAnswer.text).toBe(`A-${TESTS_FAQ_KEYS[idx]}`);
    });
  });

  it("calls each resolver exactly once per key", () => {
    let qCalls = 0;
    let aCalls = 0;
    buildTestsFaqJsonLd(
      (k) => {
        qCalls++;
        return k;
      },
      (k) => {
        aCalls++;
        return k;
      },
    );
    expect(qCalls).toBe(TESTS_FAQ_KEYS.length);
    expect(aCalls).toBe(TESTS_FAQ_KEYS.length);
  });
});
