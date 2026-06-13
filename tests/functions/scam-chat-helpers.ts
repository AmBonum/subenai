// Shared fixtures for the E53.2/E53.7 scam-chat gateway suites. Not a
// test file (vitest only collects *.test.ts) — imported by the gateway,
// injection and budget suites.

import type { Env } from "../../functions/api/scam-chat/index";

export const MAIN_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
export const DEGRADED_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
export const GUARD_MODEL = "@cf/meta/llama-guard-3-8b";
export const EMBED_MODEL = "@cf/baai/bge-m3";
export const CANARY = "CANARY-e53-test-token";

export interface AiCall {
  model: string;
  inputs: Record<string, unknown>;
}

export interface HistoryShape {
  role: string;
  content: string;
}

export interface AiScript {
  inputTopic?: boolean | "garbage";
  guard?: "safe" | "unsafe" | "garbage";
  reply?: string;
  outputTopic?: boolean | "garbage";
  failGeneration?: boolean;
}

export interface MockAi {
  calls: AiCall[];
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

export const DEFAULT_REPLY =
  "Toto vyzerá ako phishing — neklikajte na odkaz. Viac v článku /blog/phishing-priklady.";

// Workers AI's OpenAI-compatible runtime returns chat output under
// choices[0].message.content (a string) and `response` as the PARSED value
// — an object when the model emitted JSON. The mock mirrors this exactly so
// the suite exercises the real extraction path; mocking the old
// { response: "<string>" } shape is what let the prod gate bug ship green.
function aiEnvelope(content: string): Record<string, unknown> {
  let parsed: unknown = content;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = content;
  }
  return {
    choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }],
    response: parsed,
  };
}

// The mock distinguishes call kinds the same way the pipeline shapes
// them: embeddings by model id, Llama Guard by model id, topic gates by
// the strict-JSON "on_topic" instruction (input vs output by data tag),
// everything else is generation.
export function makeAi(script: AiScript = {}): MockAi {
  const calls: AiCall[] = [];
  return {
    calls,
    async run(model, inputs) {
      calls.push({ model, inputs });
      if (model.includes("bge")) return { data: [[0.1, 0.2, 0.3]] };
      if (model.includes("llama-guard")) {
        if (script.guard === "unsafe") return aiEnvelope("unsafe\nS9");
        if (script.guard === "garbage") return aiEnvelope("???");
        return aiEnvelope("safe");
      }
      const text = JSON.stringify(inputs);
      if (text.includes("on_topic")) {
        const verdict = text.includes("assistant_reply")
          ? (script.outputTopic ?? true)
          : (script.inputTopic ?? true);
        if (verdict === "garbage") return aiEnvelope("no json here");
        return aiEnvelope(JSON.stringify({ on_topic: verdict }));
      }
      if (script.failGeneration) throw new Error("model exploded");
      return aiEnvelope(script.reply ?? DEFAULT_REPLY);
    },
  };
}

export function generationCalls(ai: MockAi): AiCall[] {
  return ai.calls.filter(
    (c) =>
      !c.model.includes("bge") &&
      !c.model.includes("llama-guard") &&
      !JSON.stringify(c.inputs).includes("on_topic"),
  );
}

export interface KvPut {
  key: string;
  value: string;
  ttl?: number;
}

export interface MockKv {
  store: Map<string, string>;
  puts: KvPut[];
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export function makeKv(initial: Record<string, string> = {}): MockKv {
  const store = new Map(Object.entries(initial));
  const puts: KvPut[] = [];
  return {
    store,
    puts,
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value, options) {
      store.set(key, value);
      puts.push({ key, value, ttl: options?.expirationTtl });
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

export interface VectorChunk {
  url: string;
  text: string;
}

export interface MockVectorize {
  queries: Array<{ vector: number[]; options?: Record<string, unknown> }>;
  query(
    vector: number[],
    options?: Record<string, unknown>,
  ): Promise<{ matches: Array<{ id: string; score: number; metadata: Record<string, unknown> }> }>;
}

export const DEFAULT_CHUNKS: VectorChunk[] = [
  { url: "/blog/phishing-priklady", text: "Ako spoznať phishing: podozrivý odosielateľ a odkaz." },
];

export function makeVectorize(chunks: VectorChunk[] = DEFAULT_CHUNKS): MockVectorize {
  const queries: Array<{ vector: number[]; options?: Record<string, unknown> }> = [];
  return {
    queries,
    async query(vector, options) {
      queries.push({ vector, options });
      return {
        matches: chunks.map((chunk, i) => ({
          id: `chunk-${i}`,
          score: 0.9,
          metadata: {
            source: "blog",
            slug: `slug-${i}`,
            url: chunk.url,
            audience: "public",
            content_hash: "hash",
            text: chunk.text,
          },
        })),
      };
    },
  };
}

export function buildRequest(body: unknown, opts: { ip?: string; auth?: string } = {}): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cf-connecting-ip": opts.ip ?? "203.0.113.77",
  };
  if (opts.auth) headers.authorization = `Bearer ${opts.auth}`;
  return new Request("https://subenai.sk/api/scam-chat", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export interface TestEnv extends Env {
  AI: MockAi;
  SCAM_CHAT_INDEX: MockVectorize;
  SCAM_CHAT_KV: MockKv;
}

export function baseEnv(overrides: Partial<TestEnv> = {}): TestEnv {
  return {
    AI: makeAi(),
    SCAM_CHAT_INDEX: makeVectorize(),
    SCAM_CHAT_KV: makeKv(),
    SUPABASE_ANON_KEY: "anon-stub",
    SCAM_CHAT_CANARY: CANARY,
    ...overrides,
  };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
