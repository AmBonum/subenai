import { describe, it, expect } from "vitest";

import {
  checkPortalEligibility,
  PORTAL_SESSION_MAX_AGE_SECONDS,
} from "../../functions/api/customer-portal";

const NOW = 1_780_000_000;

const fresh = {
  status: "complete",
  mode: "subscription",
  created: NOW - 60,
};

describe("customer-portal checkPortalEligibility", () => {
  it("accepts a fresh completed subscription session", () => {
    expect(checkPortalEligibility(fresh, NOW)).toBeNull();
  });

  it("rejects an open (unpaid) session", () => {
    expect(checkPortalEligibility({ ...fresh, status: "open" }, NOW)).toBe("session_not_eligible");
  });

  it("rejects an expired-status session", () => {
    expect(checkPortalEligibility({ ...fresh, status: "expired" }, NOW)).toBe(
      "session_not_eligible",
    );
  });

  it("rejects one-time payment sessions — returning donors must use the magic-link flow", () => {
    expect(checkPortalEligibility({ ...fresh, mode: "payment" }, NOW)).toBe("session_not_eligible");
  });

  it("rejects a session older than the post-checkout window", () => {
    const old = { ...fresh, created: NOW - PORTAL_SESSION_MAX_AGE_SECONDS - 1 };
    expect(checkPortalEligibility(old, NOW)).toBe("session_expired");
  });

  it("accepts a session exactly at the window boundary", () => {
    const boundary = { ...fresh, created: NOW - PORTAL_SESSION_MAX_AGE_SECONDS };
    expect(checkPortalEligibility(boundary, NOW)).toBeNull();
  });
});
