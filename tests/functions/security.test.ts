import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  consumeCooldown,
  consumeDailyQuota,
  consumeRateLimit,
  emailCooldown,
  ipRateLimit,
  parsePositiveInt,
  readClientIp,
  verifyTurnstile,
  __test__,
  type SupportRateLimitKV,
} from "../../functions/_lib/security";

beforeEach(() => {
  __test__.resetAll();
  vi.restoreAllMocks();
});

describe("verifyTurnstile", () => {
  it("rejects when no token is supplied", async () => {
    const result = await verifyTurnstile("secret", "");
    expect(result).toEqual({ ok: false, reason: "missing_token" });
  });

  it("rejects when no secret is configured", async () => {
    const result = await verifyTurnstile("", "token");
    expect(result).toEqual({ ok: false, reason: "missing_secret" });
  });

  it("returns ok=true on Cloudflare success response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, hostname: "subenai.sk" }), {
        status: 200,
      }),
    );
    const result = await verifyTurnstile("secret", "token", "1.2.3.4");
    expect(result.ok).toBe(true);
  });

  it("surfaces Cloudflare error codes when token is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), {
        status: 200,
      }),
    );
    const result = await verifyTurnstile("secret", "bad");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid-input-response");
  });

  it("returns network_error when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    const result = await verifyTurnstile("secret", "token");
    expect(result).toEqual({ ok: false, reason: "verify_network_error" });
  });
});

describe("emailCooldown", () => {
  it("first consume succeeds, second within TTL fails", () => {
    expect(emailCooldown.consume("a@b.test", 60)).toBe(true);
    expect(emailCooldown.consume("a@b.test", 60)).toBe(false);
  });

  it("different keys are independent", () => {
    expect(emailCooldown.consume("a@b.test", 60)).toBe(true);
    expect(emailCooldown.consume("c@d.test", 60)).toBe(true);
  });

  it("reset clears the cooldown for one key", () => {
    expect(emailCooldown.consume("a@b.test", 60)).toBe(true);
    emailCooldown.reset("a@b.test");
    expect(emailCooldown.consume("a@b.test", 60)).toBe(true);
  });
});

describe("ipRateLimit", () => {
  it("allows up to N requests per window then rejects", () => {
    expect(ipRateLimit.consume("1.2.3.4", 3, 60)).toBe(true);
    expect(ipRateLimit.consume("1.2.3.4", 3, 60)).toBe(true);
    expect(ipRateLimit.consume("1.2.3.4", 3, 60)).toBe(true);
    expect(ipRateLimit.consume("1.2.3.4", 3, 60)).toBe(false);
  });

  it("different IPs have independent windows", () => {
    expect(ipRateLimit.consume("1.2.3.4", 1, 60)).toBe(true);
    expect(ipRateLimit.consume("1.2.3.4", 1, 60)).toBe(false);
    expect(ipRateLimit.consume("5.6.7.8", 1, 60)).toBe(true);
  });
});

describe("consumeDailyQuota", () => {
  it("counts up to the cap then refuses", () => {
    expect(consumeDailyQuota("test", 3)).toBe(true);
    expect(consumeDailyQuota("test", 3)).toBe(true);
    expect(consumeDailyQuota("test", 3)).toBe(true);
    expect(consumeDailyQuota("test", 3)).toBe(false);
  });

  it("scopes are independent", () => {
    expect(consumeDailyQuota("a", 1)).toBe(true);
    expect(consumeDailyQuota("a", 1)).toBe(false);
    expect(consumeDailyQuota("b", 1)).toBe(true);
  });
});

describe("readClientIp", () => {
  it("prefers cf-connecting-ip when present", () => {
    const req = new Request("https://example.com", {
      headers: { "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 2.2.2.2" },
    });
    expect(readClientIp(req)).toBe("9.9.9.9");
  });

  it("falls back to first x-forwarded-for entry", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" },
    });
    expect(readClientIp(req)).toBe("1.1.1.1");
  });

  it("returns 'unknown' when no headers are present", () => {
    expect(readClientIp(new Request("https://example.com"))).toBe("unknown");
  });
});

describe("consumeRateLimit (KV-backed, audit A3)", () => {
  function fakeKV(): SupportRateLimitKV & { store: Map<string, string> } {
    const store = new Map<string, string>();
    return {
      store,
      async get(key) {
        return store.get(key) ?? null;
      },
      async put(key, value) {
        store.set(key, value);
      },
      async delete(key) {
        store.delete(key);
      },
    };
  }

  it("allows up to the limit then rejects when KV is bound", async () => {
    const kv = fakeKV();
    for (let i = 0; i < 3; i++) {
      const ok = await consumeRateLimit(kv, "support:ip", "1.2.3.4", 3, 86400);
      expect(ok).toBe(true);
    }
    const denied = await consumeRateLimit(kv, "support:ip", "1.2.3.4", 3, 86400);
    expect(denied).toBe(false);
  });

  it("isolates buckets per identity", async () => {
    const kv = fakeKV();
    for (let i = 0; i < 3; i++) {
      expect(await consumeRateLimit(kv, "support:ip", "A", 3, 86400)).toBe(true);
    }
    // identity B still has full budget.
    expect(await consumeRateLimit(kv, "support:ip", "B", 3, 86400)).toBe(true);
  });

  it("falls back to per-isolate Map when KV binding is absent", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await consumeRateLimit(undefined, "support:ip", "X", 3, 86400)).toBe(true);
    }
    expect(await consumeRateLimit(undefined, "support:ip", "X", 3, 86400)).toBe(false);
  });
});

describe("consumeCooldown (KV-backed)", () => {
  it("blocks a second consume within the TTL window", async () => {
    const store = new Map<string, string>();
    const kv: SupportRateLimitKV = {
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
    expect(await consumeCooldown(kv, "support:email", "a@b.cz", 600)).toBe(true);
    expect(await consumeCooldown(kv, "support:email", "a@b.cz", 600)).toBe(false);
  });
});

describe("parsePositiveInt", () => {
  it.each([
    [undefined, 42, 42],
    ["", 42, 42],
    ["0", 42, 42],
    ["-5", 42, 42],
    ["abc", 42, 42],
    ["7", 42, 7],
    ["100", 42, 100],
  ])("(%j, %d) → %d", (input, fallback, expected) => {
    expect(parsePositiveInt(input as string | undefined, fallback)).toBe(expected);
  });
});
