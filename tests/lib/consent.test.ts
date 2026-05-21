import { describe, it, expect, beforeEach } from "vitest";

import {
  ALL_ACCEPTED,
  ALL_REJECTED,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  loadConsent,
  saveConsent,
  type ConsentCategories,
} from "@/lib/consent";

describe("CONSENT_VERSION (AH-7.1)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("is pinned at 1.7.0 — bumped by E44 Phase D for public template publication (Anthropic recipient + CC BY 4.0 license disclosure)", () => {
    expect(CONSENT_VERSION).toBe("1.7.0");
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
    expect(rec?.version).toBe("1.7.0");
    expect(rec?.categories.analytics).toBe(true);
  });
});

// Phase 9e — GDPR matrix: consent state machine invariants. The four cases
// below cover the entry / exit edges of the consent state machine and the
// version-bump regression sentinel for R10 in PLAN-2026-05-19.
describe("Cookie consent — state machine (9e)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("acceptAll: persists all four categories true with current version and ISO timestamp", () => {
    const before = Date.now();
    saveConsent(ALL_ACCEPTED);
    const rec = loadConsent();
    expect(rec).not.toBeNull();
    expect(rec?.version).toBe(CONSENT_VERSION);
    expect(rec?.categories).toEqual({
      necessary: true,
      preferences: true,
      analytics: true,
      marketing: true,
    });
    // Timestamp must be ISO 8601 UTC and within a reasonable window of now.
    expect(rec?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/);
    const ts = new Date(rec!.timestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(Date.now());
  });

  it("rejectAll: persists only necessary=true and the version stamp", () => {
    saveConsent(ALL_REJECTED);
    const rec = loadConsent();
    expect(rec).not.toBeNull();
    expect(rec?.version).toBe(CONSENT_VERSION);
    expect(rec?.categories).toEqual({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
    });
  });

  it("mixed: persists exactly the chosen categories without surprise upgrades", () => {
    const mixed: ConsentCategories = {
      necessary: true,
      preferences: false,
      analytics: true,
      marketing: false,
    };
    saveConsent(mixed);
    const rec = loadConsent();
    expect(rec?.categories).toEqual(mixed);
    // Defense in depth: necessary stays true even when caller passes false.
    saveConsent({ ...mixed, necessary: false });
    expect(loadConsent()?.categories.necessary).toBe(true);
  });

  it("version-bump sentinel: stored record with a different version is treated as absent", () => {
    // Pre-seed a fully-accepted record under the *previous* version. The
    // moment CONSENT_VERSION is bumped, the banner must re-appear — that's
    // the legal contract with the user when the cookie purposes change.
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: "0.0.0-stale",
        timestamp: new Date().toISOString(),
        categories: ALL_ACCEPTED,
      }),
    );
    expect(loadConsent()).toBeNull();
  });
});
