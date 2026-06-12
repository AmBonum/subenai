// Stress coverage for the shared rate-limit primitives and the
// verify-password endpoint that layers three of them. These tests fire
// bursts well past each cap and assert the limiter holds EXACTLY at the
// boundary (off-by-one bugs in a rate limiter are silent security holes),
// that windows reset, that the daily pruner doesn't leak memory, and that
// the KV-backed variants behave under repeated hits.

import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  ipRateLimit,
  consumeDailyQuota,
  consumeRateLimit,
  consumeCooldown,
  __test__ as security__test__,
  type SupportRateLimitKV,
} from "../../functions/_lib/security";
import { onRequestPost } from "../../functions/api/tests/verify-password";

beforeEach(() => {
  security__test__.resetAll();
  vi.restoreAllMocks();
});

describe("ipRateLimit.consume — burst at the boundary", () => {
  it("allows exactly `limit` hits in a window, denies the rest", () => {
    const limit = 5;
    const results = Array.from({ length: 20 }, () => ipRateLimit.consume("burst:key", limit, 900));
    expect(results.filter(Boolean)).toHaveLength(limit);
    expect(results.slice(0, limit).every(Boolean)).toBe(true);
    expect(results.slice(limit).some(Boolean)).toBe(false);
  });

  it("resets once the window elapses (clock advanced past windowEndsAt)", () => {
    let now = 1_000_000;
    const spy = vi.spyOn(Date, "now").mockImplementation(() => now);
    const limit = 3;
    for (let i = 0; i < limit; i++) expect(ipRateLimit.consume("win:key", limit, 1)).toBe(true);
    expect(ipRateLimit.consume("win:key", limit, 1)).toBe(false);
    now += 1_001; // window was 1s
    expect(ipRateLimit.consume("win:key", limit, 1)).toBe(true);
    spy.mockRestore();
  });

  it("keeps independent counters per key — one hot key never starves another", () => {
    const limit = 2;
    expect(ipRateLimit.consume("k:a", limit, 900)).toBe(true);
    expect(ipRateLimit.consume("k:a", limit, 900)).toBe(true);
    expect(ipRateLimit.consume("k:a", limit, 900)).toBe(false);
    // Different key — full allowance.
    expect(ipRateLimit.consume("k:b", limit, 900)).toBe(true);
    expect(ipRateLimit.consume("k:b", limit, 900)).toBe(true);
  });

  it("holds the cap under 500 concurrent consume() calls (synchronous → exact)", async () => {
    const limit = 50;
    const calls = Array.from({ length: 500 }, () =>
      Promise.resolve().then(() => ipRateLimit.consume("conc:key", limit, 3600)),
    );
    const settled = await Promise.all(calls);
    expect(settled.filter(Boolean)).toHaveLength(limit);
  });
});

describe("consumeDailyQuota — cap + memory hygiene", () => {
  it("allows exactly `limit` per day then denies", () => {
    const limit = 200;
    const results = Array.from({ length: limit + 25 }, () =>
      consumeDailyQuota("daily:scope", limit),
    );
    expect(results.filter(Boolean)).toHaveLength(limit);
  });

  it("each day has an independent counter — a new day resets the allowance", () => {
    let iso = "2026-06-10T12:00:00.000Z";
    const spy = vi.spyOn(Date.prototype, "toISOString").mockImplementation(() => iso);
    // Day 1: cap of 1 — first allowed, second denied.
    expect(consumeDailyQuota("prune:scope", 1)).toBe(true);
    expect(consumeDailyQuota("prune:scope", 1)).toBe(false);
    // Day 2 (rollover): fresh allowance even though day 1 was exhausted.
    iso = "2026-06-11T12:00:00.000Z";
    expect(consumeDailyQuota("prune:scope", 1)).toBe(true);
    // Day 3: the rollover call prunes the stale day-1/2 keys (memory
    // hygiene) and again starts fresh.
    iso = "2026-06-12T12:00:00.000Z";
    expect(consumeDailyQuota("prune:scope", 1)).toBe(true);
    expect(consumeDailyQuota("prune:scope", 1)).toBe(false);
    spy.mockRestore();
  });
});

describe("consumeRateLimit / consumeCooldown — KV-backed under repeated hits", () => {
  function makeKv(): SupportRateLimitKV & { store: Map<string, string> } {
    const store = new Map<string, string>();
    return {
      store,
      async get(k) {
        return store.get(k) ?? null;
      },
      async put(k, v) {
        store.set(k, v);
      },
      async delete(k) {
        store.delete(k);
      },
    };
  }

  it("KV rate limit denies once the stored counter reaches the cap", async () => {
    const kv = makeKv();
    const limit = 10;
    const results: boolean[] = [];
    for (let i = 0; i < 15; i++) {
      results.push(await consumeRateLimit(kv, "scope", "ip-1", limit, 86400));
    }
    expect(results.filter(Boolean)).toHaveLength(limit);
  });

  it("KV cooldown denies the second hit within the TTL window", async () => {
    const kv = makeKv();
    expect(await consumeCooldown(kv, "portal", "a@b.test", 900)).toBe(true);
    expect(await consumeCooldown(kv, "portal", "a@b.test", 900)).toBe(false);
    // Different identity is unaffected.
    expect(await consumeCooldown(kv, "portal", "c@d.test", 900)).toBe(true);
  });

  it("falls back to the in-memory bucket when no KV binding is supplied", async () => {
    const limit = 3;
    const results: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      results.push(await consumeRateLimit(undefined, "nokv", "ip-2", limit, 3600));
    }
    expect(results.filter(Boolean)).toHaveLength(limit);
  });
});

// ---------------------------------------------------------------------------
// Endpoint-level: verify-password layers L1 (per-IP-per-share = 5/15min),
// L2 (per-share global = 50/h), L3 (per-share daily = 200). A burst from a
// single IP must trip L1 at the 6th attempt; a distributed burst trips L2.
// ---------------------------------------------------------------------------

const env = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_stub",
  JWT_SECRET: "stress-secret",
};
const SHARE_ID = "stressshare01";

function buildRequest(ip: string) {
  return new Request("https://subenai.sk/api/tests/verify-password", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({ share_id: SHARE_ID, password: "guess" }),
  });
}

function stubSupabaseAlwaysWrong() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("/rest/v1/tests?")) {
      return new Response(JSON.stringify([{ id: "11111111-2222-3333-4444-555555555555" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/rest/v1/rpc/verify_test_password")) {
      return new Response(JSON.stringify([{ verified: false, current_pv: 0 }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/rest/v1/audit_log")) {
      return new Response("[]", { status: 201 });
    }
    return new Response("not stubbed: " + url, { status: 500 });
  });
}

describe("verify-password — rate-limit stress at the endpoint", () => {
  it("single IP: the 6th attempt within the window returns 429 rate_limited", async () => {
    stubSupabaseAlwaysWrong();
    const ip = "203.0.113.99";
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const r = await onRequestPost({ request: buildRequest(ip), env });
      statuses.push(r.status);
    }
    // 5 wrong-password 401s, then 429s.
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.slice(5).every((s) => s === 429)).toBe(true);
  });

  it("distributed burst across many IPs trips the per-share global cap (50/h)", async () => {
    stubSupabaseAlwaysWrong();
    const statuses: number[] = [];
    // 60 distinct IPs, 1 attempt each — L1 never trips (1 < 5), so only L2
    // (global 50) and L3 (daily 200) gate. The 51st must be 429.
    for (let i = 0; i < 60; i++) {
      const r = await onRequestPost({ request: buildRequest(`198.51.100.${i}`), env });
      statuses.push(r.status);
    }
    const blocked = statuses.filter((s) => s === 429).length;
    const allowed = statuses.filter((s) => s === 401).length;
    expect(allowed).toBe(50);
    expect(blocked).toBe(10);
  });

  it("concurrent burst from one IP still admits at most 5 to the password check", async () => {
    stubSupabaseAlwaysWrong();
    const ip = "192.0.2.7";
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => onRequestPost({ request: buildRequest(ip), env })),
    );
    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 401)).toHaveLength(5);
    expect(statuses.filter((s) => s === 429)).toHaveLength(15);
  });
});
