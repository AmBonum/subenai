import { describe, expect, it } from "vitest";

import {
  EVIDENCE_PASS_SCORE,
  PLANS,
  evaluateEvidenceAccess,
  getPlan,
  isActiveSubscription,
  type OrgSubscription,
} from "@/lib/billing/plans";

const NOW = new Date("2026-11-01T10:00:00Z");

function sub(overrides: Partial<OrgSubscription> = {}): OrgSubscription {
  return {
    plan: "firma",
    status: "active",
    respondent_cap: 100,
    current_period_start: "2026-10-01T00:00:00Z",
    current_period_end: "2027-10-01T00:00:00Z",
    ...overrides,
  };
}

describe("plan catalogue", () => {
  it("prices and caps grow together and every id resolves", () => {
    const sorted = [...PLANS].sort((a, b) => a.priceEur - b.priceEur);
    expect(sorted.map((p) => p.id)).toEqual(["start", "firma", "firma_plus"]);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].respondentCap).toBeGreaterThan(sorted[i - 1].respondentCap);
      expect(sorted[i].priceEur / sorted[i].respondentCap).toBeLessThan(
        sorted[i - 1].priceEur / sorted[i - 1].respondentCap,
      );
    }
    for (const p of PLANS) expect(getPlan(p.id)).toBe(p);
  });

  it("rejects unknown plan ids", () => {
    expect(getPlan("enterprise")).toBeUndefined();
    expect(getPlan("")).toBeUndefined();
    expect(getPlan("__proto__")).toBeUndefined();
  });

  it("pass score is a percentage", () => {
    expect(EVIDENCE_PASS_SCORE).toBeGreaterThan(0);
    expect(EVIDENCE_PASS_SCORE).toBeLessThanOrEqual(100);
  });
});

describe("isActiveSubscription", () => {
  it.each(["active", "trialing"])("%s inside the period is active", (status) => {
    expect(isActiveSubscription(sub({ status }), NOW)).toBe(true);
  });

  it.each(["canceled", "incomplete", "incomplete_expired", "unpaid", "paused", "past_due"])(
    "%s is not active",
    (status) => {
      expect(isActiveSubscription(sub({ status }), NOW)).toBe(false);
    },
  );

  it("an active row past its period end is not active", () => {
    expect(isActiveSubscription(sub({ current_period_end: "2026-10-31T23:59:59Z" }), NOW)).toBe(
      false,
    );
  });

  it("no subscription is not active", () => {
    expect(isActiveSubscription(null, NOW)).toBe(false);
  });
});

describe("evaluateEvidenceAccess", () => {
  it("free users get no evidence", () => {
    expect(evaluateEvidenceAccess(null, 0, 5, NOW)).toEqual({ allowed: false, reason: "no_plan" });
  });

  it("allows a report that fits into the remaining allowance", () => {
    expect(evaluateEvidenceAccess(sub(), 60, 40, NOW)).toEqual({
      allowed: true,
      cap: 100,
      used: 60,
      remaining: 0,
    });
  });

  it("refuses a report that would exceed the cap, with the numbers to show", () => {
    expect(evaluateEvidenceAccess(sub(), 90, 11, NOW)).toEqual({
      allowed: false,
      reason: "cap_exceeded",
      cap: 100,
      used: 90,
      requested: 11,
    });
  });

  it("uses the snapshot cap, not the current catalogue", () => {
    const grandfathered = sub({ plan: "start", respondent_cap: 30 });
    expect(evaluateEvidenceAccess(grandfathered, 0, 30, NOW).allowed).toBe(true);
  });

  it("an expired plan is treated as no plan", () => {
    expect(evaluateEvidenceAccess(sub({ status: "canceled" }), 0, 1, NOW)).toEqual({
      allowed: false,
      reason: "no_plan",
    });
  });

  it("regenerating a report whose respondents are already counted costs nothing", () => {
    expect(evaluateEvidenceAccess(sub(), 100, 0, NOW)).toEqual({
      allowed: true,
      cap: 100,
      used: 100,
      remaining: 0,
    });
  });
});
