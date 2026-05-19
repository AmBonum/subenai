import { describe, it, expect, beforeEach } from "vitest";

import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  loadConsent,
  saveConsent,
  ALL_ACCEPTED,
} from "@/lib/consent";

describe("CONSENT_VERSION (AH-7.1)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("is pinned at 1.5.0 — bumped by E16.3 for the blog launch and GA4 disclosure", () => {
    expect(CONSENT_VERSION).toBe("1.5.0");
  });

  it("re-shows the banner when a stored 1.3.0 record is encountered", () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: "1.3.0",
        timestamp: new Date().toISOString(),
        categories: ALL_ACCEPTED,
      }),
    );
    expect(loadConsent()).toBeNull();
  });

  it("returns the freshly-saved record when version matches", () => {
    saveConsent(ALL_ACCEPTED);
    const rec = loadConsent();
    expect(rec?.version).toBe("1.5.0");
    expect(rec?.categories.analytics).toBe(true);
  });
});
