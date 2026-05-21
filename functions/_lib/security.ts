// Security primitives shared across CF Pages Functions.
//
// Layered defence pattern (E11.4 portal magic link):
//   1. Cloudflare Turnstile token validation (siteverify call)
//   2. Per-email cooldown — same address can't spam itself
//   3. Per-IP rate limit — single IP can't enumerate via volume
//   4. Global daily cap — protects Resend quota even if 1+2+3 fail
//
// State storage (audit A3 — was per-isolate, now KV-backed when bound):
//
//   - When the caller supplies a `SUPPORT_RATE_LIMIT_KV` namespace
//     binding (see tasks/E48-runbook.md §3 for the bind step), counters
//     live in Cloudflare KV. State survives isolate cold-starts and is
//     shared across the region — limits actually limit.
//
//   - When the binding is absent (local dev, tests, or production
//     before the operator wires the KV namespace), the in-memory Map
//     fallback below kicks in. It's per-isolate so the cap is soft —
//     acceptable for dev, NOT acceptable for prod long-term.
//
// Read-then-write is OK for an anti-spam rate limit: even a slightly
// off counter is a 100x improvement over per-isolate semantics. We
// don't need exactly-once.
//
// Time arithmetic uses Date.now() throughout.

// Minimal KV interface (subset of @cloudflare/workers-types KVNamespace)
// — declared inline so this file can compile without the workers-types
// dev dependency wired into vitest.
export interface SupportRateLimitKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
  hostname?: string;
}

export async function verifyTurnstile(
  secret: string,
  token: string,
  ip?: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!token) return { ok: false, reason: "missing_token" };
  if (!secret) return { ok: false, reason: "missing_secret" };

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  let response: Response;
  try {
    response = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: formData });
  } catch {
    return { ok: false, reason: "verify_network_error" };
  }
  if (!response.ok) return { ok: false, reason: `verify_${response.status}` };

  const payload = (await response.json().catch(() => ({}))) as TurnstileResponse;
  if (!payload.success) {
    return { ok: false, reason: (payload["error-codes"] ?? ["invalid_token"]).join(",") };
  }
  return { ok: true };
}

interface CooldownStore {
  consume(key: string, ttlSeconds: number): boolean;
  reset(key: string): void;
}

const cooldownMap = new Map<string, number>();

export const emailCooldown: CooldownStore = {
  consume(key, ttlSeconds) {
    const now = Date.now();
    const expiresAt = cooldownMap.get(key);
    if (expiresAt && expiresAt > now) return false;
    cooldownMap.set(key, now + ttlSeconds * 1000);
    cleanupExpired(cooldownMap, now);
    return true;
  },
  reset(key) {
    cooldownMap.delete(key);
  },
};

interface RateLimitStore {
  consume(key: string, limit: number, windowSeconds: number): boolean;
  reset(key: string): void;
}

interface BucketEntry {
  count: number;
  windowEndsAt: number;
}

const ipBucket = new Map<string, BucketEntry>();

export const ipRateLimit: RateLimitStore = {
  consume(key, limit, windowSeconds) {
    const now = Date.now();
    const entry = ipBucket.get(key);
    if (!entry || entry.windowEndsAt < now) {
      ipBucket.set(key, { count: 1, windowEndsAt: now + windowSeconds * 1000 });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count += 1;
    return true;
  },
  reset(key) {
    ipBucket.delete(key);
  },
};

const dailyCounter = new Map<string, number>();

export function consumeDailyQuota(scope: string, limit: number): boolean {
  const todayKey = `${scope}:${new Date().toISOString().slice(0, 10)}`;
  const used = dailyCounter.get(todayKey) ?? 0;
  if (used >= limit) return false;
  dailyCounter.set(todayKey, used + 1);
  pruneOldDailyKeys(scope, todayKey);
  return true;
}

function pruneOldDailyKeys(scope: string, todayKey: string) {
  for (const key of dailyCounter.keys()) {
    if (key.startsWith(`${scope}:`) && key !== todayKey) {
      dailyCounter.delete(key);
    }
  }
}

function cleanupExpired(map: Map<string, number>, now: number) {
  if (map.size < 1000) return;
  for (const [k, v] of map) {
    if (v <= now) map.delete(k);
  }
}

export function readClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ---------- KV-backed variants (audit A3) ------------------------------
//
// `consumeRateLimit` / `consumeCooldown` prefer KV when a binding is
// provided, otherwise fall through to the in-memory bucket above. Use
// these from new code; the legacy `ipRateLimit.consume` / `emailCooldown
// .consume` stay for hot-path code paths we haven't migrated yet.

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Consume one slot from a daily rate-limit bucket. Returns true if the
 * caller is allowed, false if the cap is hit.
 *
 * `limit` is the per-day cap and `windowSeconds` is the TTL on the KV
 * entry (typically 86400). The KV key embeds the day stamp so old
 * entries expire naturally without us walking the namespace.
 */
export async function consumeRateLimit(
  kv: SupportRateLimitKV | undefined,
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!kv) {
    // Fallback to per-isolate Map — better than nothing in dev, but the
    // production deploy MUST bind a KV namespace (runbook §3).
    return ipRateLimit.consume(`${scope}:${identity}`, limit, windowSeconds);
  }
  const key = `rl:${scope}:${identity}:${todayKey()}`;
  const raw = await kv.get(key);
  const current = raw ? Number.parseInt(raw, 10) : 0;
  if (Number.isFinite(current) && current >= limit) return false;
  // Best-effort read-then-write. Two concurrent calls can both see
  // `current = 9` and both write `10` — the worst-case overshoot is
  // (isolates × 1) per window. For a 10/24h anti-spam cap this is a
  // rounding error compared to per-isolate state. If we ever need exact
  // counting (e.g. paid quota) swap in Durable Objects.
  await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
  return true;
}

/**
 * Same shape as `emailCooldown.consume` but KV-backed. `ttlSeconds` is
 * both the cooldown duration and the KV TTL.
 */
export async function consumeCooldown(
  kv: SupportRateLimitKV | undefined,
  scope: string,
  identity: string,
  ttlSeconds: number,
): Promise<boolean> {
  if (!kv) {
    return emailCooldown.consume(`${scope}:${identity}`, ttlSeconds);
  }
  const key = `cd:${scope}:${identity}`;
  const raw = await kv.get(key);
  if (raw) return false; // still in cooldown
  await kv.put(key, "1", { expirationTtl: ttlSeconds });
  return true;
}

// Test-only helpers — the Maps are module-level so tests need to reset them
// between cases. Production code never imports these.
export const __test__ = {
  resetAll() {
    cooldownMap.clear();
    ipBucket.clear();
    dailyCounter.clear();
  },
};
