// E53.7 — rate limits, quotas + neuron budget ledger: limit boundaries,
// soft model switch, hard fail-closed 429 (verbatim string), day
// rollover, missing-KV fail-closed, concurrent overshoot tolerance.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { onRequestPost, type Env } from "../../functions/api/scam-chat/index";
import {
  createNeuronLedger,
  recordIncident,
  resolveThresholds,
  todayStamp,
  DEFAULT_HARD_NEURONS,
  DEFAULT_SOFT_NEURONS,
  FAIL_CLOSED_MESSAGE,
  LEDGER_TTL_SECONDS,
} from "../../functions/_lib/scam-chat/budget";
import { NEURON_ESTIMATES } from "../../functions/_lib/scam-chat/run-ai";
import { __test__ as security__test__ } from "../../functions/_lib/security";
import {
  baseEnv,
  buildRequest,
  generationCalls,
  makeAi,
  makeKv,
  today,
  DEGRADED_MODEL,
  MAIN_MODEL,
} from "./scam-chat-helpers";

beforeEach(() => {
  security__test__.resetAll();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("neuron ledger (unit)", () => {
  it("resolves env-tunable thresholds via parsePositiveInt with plan defaults", () => {
    expect(resolveThresholds({})).toEqual({
      soft: DEFAULT_SOFT_NEURONS,
      hard: DEFAULT_HARD_NEURONS,
    });
    expect(
      resolveThresholds({ SCAM_CHAT_NEURON_SOFT: "100", SCAM_CHAT_NEURON_HARD: "200" }),
    ).toEqual({ soft: 100, hard: 200 });
    expect(resolveThresholds({ SCAM_CHAT_NEURON_HARD: "garbage" }).hard).toBe(DEFAULT_HARD_NEURONS);
  });

  it("reports ok below soft, soft at/above soft, hard at/above hard", async () => {
    const kv = makeKv();
    const ledger = createNeuronLedger(kv, { soft: 100, hard: 200 });
    expect(await ledger.status()).toBe("ok");
    await ledger.record(99);
    expect(await ledger.status()).toBe("ok");
    await ledger.record(1);
    expect(await ledger.status()).toBe("soft");
    await ledger.record(100);
    expect(await ledger.status()).toBe("hard");
  });

  it("writes day-stamped keys with TTL 86400", async () => {
    const kv = makeKv();
    const ledger = createNeuronLedger(kv, { soft: 100, hard: 200 });
    await ledger.record(10);
    expect(kv.puts).toHaveLength(1);
    expect(kv.puts[0].key).toBe(`sc:neurons:${today()}`);
    expect(kv.puts[0].ttl).toBe(LEDGER_TTL_SECONDS);
    expect(kv.store.get(`sc:neurons:${today()}`)).toBe("10");
  });

  it("rolls over at the UTC day boundary", async () => {
    const kv = makeKv();
    let now = new Date("2026-06-13T23:59:00Z");
    const ledger = createNeuronLedger(kv, { soft: 100, hard: 200 }, () => now);
    await ledger.record(500);
    expect(await ledger.status()).toBe("hard");
    now = new Date("2026-06-14T00:01:00Z");
    expect(await ledger.status()).toBe("ok");
    expect(todayStamp(now)).toBe("2026-06-14");
  });

  it("missing KV fails CLOSED (status hard, loud log) — free-tier overrun impossible", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ledger = createNeuronLedger(undefined, { soft: 100, hard: 200 });
    expect(await ledger.status()).toBe("hard");
    await expect(ledger.record(10)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("FAILS CLOSED"));
  });

  it("corrupted counter fails closed", async () => {
    const kv = makeKv({ [`sc:neurons:${today()}`]: "not-a-number" });
    const ledger = createNeuronLedger(kv, { soft: 100, hard: 200 });
    expect(await ledger.status()).toBe("hard");
  });

  it("tolerates concurrent read-then-write overshoot (undercount, like security.ts)", async () => {
    const kv = makeKv();
    const ledger = createNeuronLedger(kv, { soft: 100, hard: 200 });
    await Promise.all([ledger.record(10), ledger.record(10)]);
    // Both raced reads saw 0; the counter undercounts by one increment.
    expect(kv.store.get(`sc:neurons:${today()}`)).toBe("10");
  });

  it("recordIncident counts per kind per day and noops without KV", async () => {
    const kv = makeKv();
    await recordIncident(kv, "canary");
    await recordIncident(kv, "canary");
    expect(kv.store.get(`sc:incident:canary:${today()}`)).toBe("2");
    await expect(recordIncident(undefined, "canary")).resolves.toBeUndefined();
  });
});

describe("gateway budget integration", () => {
  it("hard threshold → 429 with the verbatim fail-closed string and zero AI calls", async () => {
    const env = baseEnv();
    await env.SCAM_CHAT_KV.put(`sc:neurons:${today()}`, String(DEFAULT_HARD_NEURONS));
    const res = await onRequestPost({ request: buildRequest({ message: "Je toto podvod?" }), env });
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe("quota_exhausted");
    expect(body.message).toBe(
      "Asistent má dnes plno. Skúste to, prosím, zajtra — alebo si zatiaľ pozrite naše kurzy o podvodoch.",
    );
    expect(env.AI.calls).toHaveLength(0);
  });

  it("soft threshold demonstrably switches generation to the 8B model", async () => {
    const env = baseEnv({ SCAM_CHAT_NEURON_SOFT: "100" });
    await env.SCAM_CHAT_KV.put(`sc:neurons:${today()}`, "150");
    const res = await onRequestPost({ request: buildRequest({ message: "Je toto podvod?" }), env });
    expect(res.status).toBe(200);
    const gen = generationCalls(env.AI);
    expect(gen).toHaveLength(1);
    expect(gen[0].model).toBe(DEGRADED_MODEL);
    expect(((await res.json()) as { degraded: boolean }).degraded).toBe(true);
  });

  it("below soft threshold the 70B main model generates", async () => {
    const env = baseEnv();
    const res = await onRequestPost({ request: buildRequest({ message: "Je toto podvod?" }), env });
    expect(res.status).toBe(200);
    const gen = generationCalls(env.AI);
    expect(gen).toHaveLength(1);
    expect(gen[0].model).toBe(MAIN_MODEL);
    expect(((await res.json()) as { degraded: boolean }).degraded).toBe(false);
  });

  it("env-tunable hard cap is honored", async () => {
    const env = baseEnv({ SCAM_CHAT_NEURON_HARD: "200" });
    await env.SCAM_CHAT_KV.put(`sc:neurons:${today()}`, "250");
    const res = await onRequestPost({ request: buildRequest({ message: "Je toto podvod?" }), env });
    expect(res.status).toBe(429);
  });

  it("every AI call is metered: a full turn records the summed estimates", async () => {
    const env = baseEnv();
    await onRequestPost({ request: buildRequest({ message: "Je toto podvod?" }), env });
    const expected =
      NEURON_ESTIMATES.gate_topic_input +
      NEURON_ESTIMATES.gate_guard +
      NEURON_ESTIMATES.embed +
      NEURON_ESTIMATES.generate_main +
      NEURON_ESTIMATES.gate_topic_output;
    expect(env.SCAM_CHAT_KV.store.get(`sc:neurons:${today()}`)).toBe(String(expected));
  });

  it("missing KV binding → ledger fails closed at the gateway (429 verbatim, zero AI calls)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const env: Env & { AI: ReturnType<typeof makeAi> } = {
      ...baseEnv(),
      SCAM_CHAT_KV: undefined,
      SUPPORT_RATE_LIMIT_KV: undefined,
    };
    const res = await onRequestPost({ request: buildRequest({ message: "Je toto podvod?" }), env });
    expect(res.status).toBe(429);
    expect(((await res.json()) as { message: string }).message).toBe(FAIL_CLOSED_MESSAGE);
    expect(env.AI.calls).toHaveLength(0);
  });
});

describe("rate limits", () => {
  it("per-IP 10/10min: passes at 9 used, blocks at 10 used", async () => {
    const okEnv = baseEnv();
    await okEnv.SCAM_CHAT_KV.put(`rl:sc-10m:198.51.100.9:${today()}`, "9");
    const okRes = await onRequestPost({
      request: buildRequest({ message: "Je toto podvod?" }, { ip: "198.51.100.9" }),
      env: okEnv,
    });
    expect(okRes.status).toBe(200);

    const blockedEnv = baseEnv();
    await blockedEnv.SCAM_CHAT_KV.put(`rl:sc-10m:198.51.100.9:${today()}`, "10");
    const blockedRes = await onRequestPost({
      request: buildRequest({ message: "Je toto podvod?" }, { ip: "198.51.100.9" }),
      env: blockedEnv,
    });
    expect(blockedRes.status).toBe(429);
    const body = (await blockedRes.json()) as { error: string; message: string };
    expect(body.error).toBe("rate_limited");
    expect(body.message).toBe("Príliš veľa správ za sebou. Skúste to, prosím, o pár minút.");
    expect(blockedEnv.AI.calls).toHaveLength(0);
  });

  it("per-IP 40/day blocks the 41st message", async () => {
    const env = baseEnv();
    await env.SCAM_CHAT_KV.put(`rl:sc-day:198.51.100.9:${today()}`, "40");
    const res = await onRequestPost({
      request: buildRequest({ message: "Je toto podvod?" }, { ip: "198.51.100.9" }),
      env,
    });
    expect(res.status).toBe(429);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Dnešný limit správ bol vyčerpaný. Skúste to, prosím, zajtra.");
  });

  it("global daily cap (default 400) fails closed with the verbatim string", async () => {
    const env = baseEnv();
    await env.SCAM_CHAT_KV.put(`rl:sc-global:all:${today()}`, "400");
    const res = await onRequestPost({ request: buildRequest({ message: "Je toto podvod?" }), env });
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe("quota_exhausted");
    expect(body.message).toBe(FAIL_CLOSED_MESSAGE);
  });

  it("global cap is env-tunable via SCAM_CHAT_GLOBAL_DAILY", async () => {
    const env = baseEnv({ SCAM_CHAT_GLOBAL_DAILY: "2" });
    await env.SCAM_CHAT_KV.put(`rl:sc-global:all:${today()}`, "2");
    const res = await onRequestPost({ request: buildRequest({ message: "Je toto podvod?" }), env });
    expect(res.status).toBe(429);
  });

  it("per-IP caps are env-tunable", async () => {
    const env = baseEnv({ SCAM_CHAT_IP_PER_10MIN: "1" });
    await env.SCAM_CHAT_KV.put(`rl:sc-10m:198.51.100.9:${today()}`, "1");
    const res = await onRequestPost({
      request: buildRequest({ message: "Je toto podvod?" }, { ip: "198.51.100.9" }),
      env,
    });
    expect(res.status).toBe(429);
  });

  it("rate limits fall back to in-memory when KV is missing (ledger still closed)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const make = () =>
      ({ ...baseEnv(), SCAM_CHAT_KV: undefined, SUPPORT_RATE_LIMIT_KV: undefined }) as Env;
    // 10 in-memory slots for this IP; the 11th must be rate-limited
    // BEFORE the ledger 429 — proving the in-memory fallback engaged.
    for (let i = 0; i < 10; i += 1) {
      const res = await onRequestPost({
        request: buildRequest({ message: "Je toto podvod?" }, { ip: "198.51.100.50" }),
        env: make(),
      });
      expect(res.status).toBe(429); // ledger fail-closed
      expect(((await res.json()) as { error: string }).error).toBe("quota_exhausted");
    }
    const res = await onRequestPost({
      request: buildRequest({ message: "Je toto podvod?" }, { ip: "198.51.100.50" }),
      env: make(),
    });
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: string }).error).toBe("rate_limited");
  });
});
