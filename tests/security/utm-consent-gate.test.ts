// E42 / P-17 — UTM parameter reading is consent-gated.
//
// `/privacy` s4 promises: "čítame iba ak máš v consent dialógu zapnutý
// súhlas s analytikou" for UTM parameters. The implementation lives in
// `src/lib/share/intents.ts` (`readUtmFromUrl`) and gates on
// `hasConsent(consent, "analytics")`. This spec locks the contract:
// passing a record with analytics:false must return null even when the
// URL clearly contains utm_*.

import { describe, expect, it } from "vitest";

import { readUtmFromUrl } from "@/lib/share/intents";
import type { ConsentRecord } from "@/lib/consent";

function record(analytics: boolean): ConsentRecord {
  return {
    version: "test-1.0.0",
    timestamp: "2026-05-20T00:00:00Z",
    categories: {
      necessary: true,
      preferences: false,
      analytics,
      marketing: false,
    },
  };
}

const URL_WITH_UTM = "https://subenai.sk/?utm_source=facebook&utm_medium=share&utm_campaign=test";

describe("readUtmFromUrl — analytics consent gate (P-17)", () => {
  it("returns parsed UTM params when analytics consent is granted", () => {
    const result = readUtmFromUrl(URL_WITH_UTM, record(true));
    expect(result).toEqual({
      source: "facebook",
      medium: "share",
      campaign: "test",
    });
  });

  it("returns null when analytics consent is denied (URL ignored)", () => {
    const result = readUtmFromUrl(URL_WITH_UTM, record(false));
    expect(result, "without analytics consent, UTM params must NOT be read").toBeNull();
  });

  it("returns null when consent record is missing entirely (pre-decision)", () => {
    expect(readUtmFromUrl(URL_WITH_UTM, null)).toBeNull();
  });

  it("returns null when the URL has no UTM params, even with consent", () => {
    expect(readUtmFromUrl("https://subenai.sk/", record(true))).toBeNull();
  });

  it("returns null on a malformed URL without throwing", () => {
    expect(readUtmFromUrl("not-a-url", record(true))).toBeNull();
  });
});
