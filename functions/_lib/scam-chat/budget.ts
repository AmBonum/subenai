// E53.7 — neuron budget ledger. Every AI call records an estimated
// neuron cost into a day-stamped KV counter (TTL 86,400 → no unbounded
// growth). Soft threshold degrades generation to the 8B model; hard
// threshold fails the endpoint closed (429) for the rest of the UTC day
// so free-tier overrun is impossible.
//
// Missing/misconfigured KV binding: the LEDGER fails closed (no spend
// can be accounted → no spend is allowed), while the rate limits in
// functions/_lib/security.ts fall back to a per-isolate in-memory Map.
// The asymmetry is deliberate: a soft rate limit risks spam, a soft
// neuron ledger risks paid usage — only the latter is unacceptable.

import { parsePositiveInt, type SupportRateLimitKV } from "../security";

// Verbatim fail-closed UI string from the plan's §Cost section.
export const FAIL_CLOSED_MESSAGE =
  "Asistent má dnes plno. Skúste to, prosím, zajtra — alebo si zatiaľ pozrite naše kurzy o podvodoch.";

// Shown when the KV binding is missing/unreadable — a configuration fault,
// NOT exhausted budget. Kept distinct from FAIL_CLOSED_MESSAGE so an
// unwired binding never masquerades as "out of tokens" (it once cost hours
// of misdiagnosis). The gateway pairs this with HTTP 503 + a loud log.
export const SERVICE_UNAVAILABLE_MESSAGE =
  "Asistent je dočasne nedostupný. Skúste to, prosím, o chvíľu.";

export const DEFAULT_SOFT_NEURONS = 5_000;
export const DEFAULT_HARD_NEURONS = 8_500;
export const LEDGER_TTL_SECONDS = 86_400;
const INCIDENT_TTL_SECONDS = 7 * 86_400;

export type LedgerStatus = "ok" | "soft" | "hard" | "unconfigured";

export interface NeuronLedger {
  status(): Promise<LedgerStatus>;
  record(neurons: number): Promise<void>;
}

export function todayStamp(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export interface LedgerThresholds {
  soft: number;
  hard: number;
}

export function resolveThresholds(env: {
  SCAM_CHAT_NEURON_SOFT?: string;
  SCAM_CHAT_NEURON_HARD?: string;
}): LedgerThresholds {
  return {
    soft: parsePositiveInt(env.SCAM_CHAT_NEURON_SOFT, DEFAULT_SOFT_NEURONS),
    hard: parsePositiveInt(env.SCAM_CHAT_NEURON_HARD, DEFAULT_HARD_NEURONS),
  };
}

export function createNeuronLedger(
  kv: SupportRateLimitKV | undefined,
  thresholds: LedgerThresholds,
  now: () => Date = () => new Date(),
): NeuronLedger {
  if (!kv) {
    console.error(
      "scam-chat: KV binding missing — neuron ledger FAILS CLOSED (no AI spend possible). " +
        "Bind SCAM_CHAT_KV (or SUPPORT_RATE_LIMIT_KV) in CF Pages settings.",
    );
    return {
      async status() {
        return "unconfigured";
      },
      async record() {},
    };
  }
  const key = () => `sc:neurons:${todayStamp(now())}`;
  return {
    async status() {
      const raw = await kv.get(key());
      const used = raw ? Number.parseInt(raw, 10) : 0;
      // Corrupted counter → fail closed rather than risk paid usage.
      if (!Number.isFinite(used)) return "hard";
      if (used >= thresholds.hard) return "hard";
      if (used >= thresholds.soft) return "soft";
      return "ok";
    },
    async record(neurons) {
      // Read-then-write like consumeRateLimit in security.ts: concurrent
      // isolates can undercount by one increment per race. For a budget
      // with 15 % headroom (8,500 of 10,000) that tolerance is fine; an
      // exact counter would need Durable Objects.
      const k = key();
      const raw = await kv.get(k);
      const used = raw ? Number.parseInt(raw, 10) : 0;
      const next = (Number.isFinite(used) ? used : 0) + neurons;
      await kv.put(k, String(next), { expirationTtl: LEDGER_TTL_SECONDS });
    },
  };
}

// Output-gate incident counter (plan §Security layer 7) — admin can
// inspect volume via the KV dashboard. Best-effort; missing KV is a noop.
export async function recordIncident(
  kv: SupportRateLimitKV | undefined,
  kind: string,
  now: Date = new Date(),
): Promise<void> {
  if (!kv) return;
  const key = `sc:incident:${kind}:${todayStamp(now)}`;
  const raw = await kv.get(key);
  const used = raw ? Number.parseInt(raw, 10) : 0;
  await kv.put(key, String((Number.isFinite(used) ? used : 0) + 1), {
    expirationTtl: INCIDENT_TTL_SECONDS,
  });
}
