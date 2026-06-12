// E53.2 — Vectorize retrieval with role-aware audience filter (E53.6).
// The Wave-A index builder (scripts/build-rag-index.ts) stores chunk
// text in metadata, so the query response is self-contained — no second
// store needed.

import type { AiRunner } from "./run-ai";

export interface VectorizeMatch {
  id: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface VectorizeQueryOptions {
  topK?: number;
  filter?: Record<string, unknown>;
  returnMetadata?: boolean | string;
}

// Minimal local binding type (functions/** compiles without
// @cloudflare/workers-types — same approach as SupportRateLimitKV).
export interface VectorizeIndexBinding {
  query(vector: number[], options?: VectorizeQueryOptions): Promise<{ matches: VectorizeMatch[] }>;
}

export interface RetrievedChunk {
  url: string;
  text: string;
}

export type ChatRole = "anon" | "user";

export const RETRIEVAL_TOP_K = 6;

// anon → public only; signed-in → public + app. Admin is a corpus
// blackout (never indexed), not a filter value.
export function audienceFilter(role: ChatRole): Record<string, unknown> {
  return role === "user" ? { audience: { $in: ["public", "app"] } } : { audience: "public" };
}

export async function retrieveContext(
  runAi: AiRunner,
  embedModel: string,
  index: VectorizeIndexBinding,
  message: string,
  role: ChatRole,
): Promise<RetrievedChunk[]> {
  const embedRaw = await runAi("embed", embedModel, { text: [message] });
  const vector = extractEmbedding(embedRaw);
  if (!vector) return [];

  const result = await index.query(vector, {
    topK: RETRIEVAL_TOP_K,
    filter: audienceFilter(role),
    returnMetadata: "all",
  });

  const chunks: RetrievedChunk[] = [];
  for (const match of result.matches ?? []) {
    const meta = match.metadata ?? {};
    const url = typeof meta.url === "string" ? meta.url : null;
    const text = typeof meta.text === "string" ? meta.text : null;
    if (url && text) chunks.push({ url, text });
  }
  return chunks;
}

function extractEmbedding(raw: unknown): number[] | null {
  if (!raw || typeof raw !== "object") return null;
  const data = (raw as { data?: unknown }).data;
  if (
    Array.isArray(data) &&
    Array.isArray(data[0]) &&
    data[0].every((n) => typeof n === "number")
  ) {
    return data[0] as number[];
  }
  return null;
}
