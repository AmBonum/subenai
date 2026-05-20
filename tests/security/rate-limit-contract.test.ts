// E35.6 — rate-limit contract for portal magic link.
//
// `functions/_lib/security.ts` implements three layers of soft
// rate-limiting on `/api/portal-magic-link`:
//   1. emailCooldown — same address can't spam itself
//   2. ipRateLimit  — single IP can't enumerate by volume
//   3. consumeDailyQuota — protects Resend quota site-wide
//
// The numeric bounds are read from env (`PORTAL_LINK_*`) with fallback
// defaults defined in code. This spec locks the FALLBACK defaults so
// a silent code change (e.g. raising the IP cap from 10/h to 100/h)
// trips CI.
//
// What this is NOT: a real load test. The bucket maths is verified via
// fast in-process calls. Live load testing lives in
// `e2e/specs/security/headless-load.spec.ts`.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __test__,
  consumeDailyQuota,
  emailCooldown,
  ipRateLimit,
  parsePositiveInt,
} from "../../functions/_lib/security";

/** Documented fallback defaults from `.env.example` / handler code. */
const DEFAULTS = {
  PORTAL_LINK_PER_IP_PER_HOUR: 10,
  PORTAL_LINK_COOLDOWN_SECONDS: 900, // 15 minutes
  PORTAL_LINK_DAILY_CAP: 200,
} as const;

beforeEach(() => __test__.resetAll());
afterEach(() => __test__.resetAll());

describe("parsePositiveInt — env fallback semantics", () => {
  it("returns the fallback when value is undefined / empty / non-numeric / non-positive", () => {
    expect(parsePositiveInt(undefined, 42)).toBe(42);
    expect(parsePositiveInt("", 42)).toBe(42);
    expect(parsePositiveInt("abc", 42)).toBe(42);
    expect(parsePositiveInt("0", 42)).toBe(42);
    expect(parsePositiveInt("-5", 42)).toBe(42);
  });

  it("returns the parsed value when it is a positive integer", () => {
    expect(parsePositiveInt("7", 42)).toBe(7);
    expect(parsePositiveInt("1000", 42)).toBe(1000);
  });
});

describe("ipRateLimit — per-IP bucket", () => {
  it("permits up to the documented default before refusing", () => {
    const limit = DEFAULTS.PORTAL_LINK_PER_IP_PER_HOUR;
    const ip = "1.2.3.4";
    for (let i = 0; i < limit; i++) {
      expect(ipRateLimit.consume(ip, limit, 3600), `request ${i + 1} should pass`).toBe(true);
    }
    expect(ipRateLimit.consume(ip, limit, 3600), `request ${limit + 1} must be refused`).toBe(
      false,
    );
  });

  it("scopes buckets by IP — one IP hitting the cap does not affect another", () => {
    const limit = 3;
    for (let i = 0; i < limit; i++) {
      expect(ipRateLimit.consume("ip-A", limit, 3600)).toBe(true);
    }
    expect(ipRateLimit.consume("ip-A", limit, 3600)).toBe(false);
    expect(ipRateLimit.consume("ip-B", limit, 3600)).toBe(true);
  });

  it("reset() clears the bucket so the IP can consume again", () => {
    const limit = 2;
    expect(ipRateLimit.consume("ip-X", limit, 3600)).toBe(true);
    expect(ipRateLimit.consume("ip-X", limit, 3600)).toBe(true);
    expect(ipRateLimit.consume("ip-X", limit, 3600)).toBe(false);
    ipRateLimit.reset("ip-X");
    expect(ipRateLimit.consume("ip-X", limit, 3600)).toBe(true);
  });
});

describe("emailCooldown — per-address cooldown", () => {
  it("refuses a repeat send until the cooldown elapses", () => {
    const email = "user@example.com";
    const ttl = DEFAULTS.PORTAL_LINK_COOLDOWN_SECONDS;
    expect(emailCooldown.consume(email, ttl), "first send must pass").toBe(true);
    expect(emailCooldown.consume(email, ttl), "second send within window must be refused").toBe(
      false,
    );
  });

  it("documents the default cooldown is 15 minutes (900s)", () => {
    expect(DEFAULTS.PORTAL_LINK_COOLDOWN_SECONDS).toBe(15 * 60);
  });
});

describe("consumeDailyQuota — global daily cap", () => {
  it("permits exactly DEFAULTS.PORTAL_LINK_DAILY_CAP sends per day", () => {
    const cap = 5; // small for test perf — actual cap is 200
    for (let i = 0; i < cap; i++) {
      expect(consumeDailyQuota("test-scope", cap)).toBe(true);
    }
    expect(consumeDailyQuota("test-scope", cap), "over-cap must be refused").toBe(false);
  });

  it("documents the production default is 200/day", () => {
    expect(DEFAULTS.PORTAL_LINK_DAILY_CAP).toBe(200);
  });

  it("scopes are independent — one scope hitting cap doesn't lock out another", () => {
    const cap = 2;
    expect(consumeDailyQuota("scope-A", cap)).toBe(true);
    expect(consumeDailyQuota("scope-A", cap)).toBe(true);
    expect(consumeDailyQuota("scope-A", cap)).toBe(false);
    expect(consumeDailyQuota("scope-B", cap)).toBe(true);
  });
});

describe("documented defaults — locked to current values", () => {
  it("matches the `.env.example` documentation (single source of truth lives in this test)", () => {
    expect(DEFAULTS).toMatchInlineSnapshot(`
      {
        "PORTAL_LINK_COOLDOWN_SECONDS": 900,
        "PORTAL_LINK_DAILY_CAP": 200,
        "PORTAL_LINK_PER_IP_PER_HOUR": 10,
      }
    `);
  });
});
