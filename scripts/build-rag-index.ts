#!/usr/bin/env node
// E53.1 — RAG corpus builder for the scam-chat assistant ("Podvodový
// poradca"). Extracts + chunks the in-repo corpus (blog MDX, courses,
// route catalog, public legal pages), embeds via Workers AI
// `@cf/baai/bge-m3` and upserts to Vectorize with hash-diff incremental
// refresh (unchanged chunks cost 0 embed calls).
//
// Usage (plan mode — no network, default when credentials are absent):
//   npm run rag:index
//   tsx scripts/build-rag-index.ts --dry-run
//
// Usage (real sync — owner runs after the Vectorize index exists, see
// tasks/E53-runbook.md §1):
//   CF_ACCOUNT_ID=... CF_API_TOKEN=... tsx scripts/build-rag-index.ts
//
// The embedding + Vectorize clients are injected interfaces so the unit
// tests (tests/scripts/build-rag-index.test.ts) run with no network.

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

import { COURSES, type Course, type CourseSection } from "../src/content/courses/index";
import {
  ROUTE_CATALOG,
  type RouteCatalogEntry,
  type RouteAudience,
} from "../functions/_lib/scam-chat/route-catalog";
import skLegal from "../src/i18n/locales/sk/legal.json";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
export const BLOG_DIR = resolve(ROOT, "src/content/blog");
const MANIFEST_PATH = resolve(ROOT, ".rag-index-manifest.json");

// ---------------------------------------------------------------------------
// Budget math (AC: stored dimensions ≤ 3.5 M).
//
// `@cf/baai/bge-m3` emits 1,024-dimensional vectors. Vectorize free tier
// caps STORED dimensions at 5,000,000; we assert at 3,500,000 (30 %
// headroom), i.e. max ⌊3,500,000 / 1,024⌋ = 3,417 chunks. The current
// corpus is 1,786 chunks ≈ 1.83 M stored dimensions (52 % of budget).
// ---------------------------------------------------------------------------
export const EMBEDDING_DIMENSIONS = 1024;
export const MAX_STORED_DIMENSIONS = 3_500_000;
export const DEFAULT_MAX_CHUNK_CHARS = 1200; // ≈ 300 tokens

export type Audience = RouteAudience;
export type CorpusSource = "blog" | "course" | "route" | "legal";

export interface RagChunkMetadata {
  source: CorpusSource;
  slug: string;
  url: string;
  audience: Audience;
  content_hash: string;
  // Chunk text rides along in metadata so the E53.2 gateway can inject
  // retrieved chunks into the prompt straight from the query response.
  text: string;
}

export interface RagChunk {
  id: string;
  text: string;
  metadata: RagChunkMetadata;
}

export interface RagVector {
  id: string;
  values: number[];
  metadata: RagChunkMetadata;
}

// ---------------------------------------------------------------------------
// Chunker — heading-aware, max-size-bounded, deterministic.
// ---------------------------------------------------------------------------

export interface Chunk {
  text: string;
  headingPath: string[];
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const MDX_MODULE_LINE_RE = /^(import|export)\s/;

function hardSplit(block: string, budget: number): string[] {
  const parts: string[] = [];
  let rest = block;
  while (rest.length > budget) {
    let cut = rest.lastIndexOf(". ", budget);
    if (cut < budget * 0.5) cut = rest.lastIndexOf(" ", budget);
    if (cut <= 0) cut = budget;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

export function chunkMarkdown(markdown: string, maxChars = DEFAULT_MAX_CHUNK_CHARS): Chunk[] {
  const blocks = markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !MDX_MODULE_LINE_RE.test(b));

  const chunks: Chunk[] = [];
  let headingStack: Array<{ level: number; text: string }> = [];
  let headingPath: string[] = [];
  let bodyBlocks: string[] = [];
  let bodyLen = 0;

  const prefixFor = (path: string[]) => (path.length > 0 ? `${path.join(" › ")}\n\n` : "");
  const budgetFor = (path: string[]) => Math.max(80, maxChars - prefixFor(path).length);

  const flush = () => {
    if (bodyBlocks.length === 0) return;
    chunks.push({
      text: `${prefixFor(headingPath)}${bodyBlocks.join("\n\n")}`,
      headingPath: [...headingPath],
    });
    bodyBlocks = [];
    bodyLen = 0;
  };

  for (const block of blocks) {
    const heading = HEADING_RE.exec(block);
    if (heading && !block.includes("\n")) {
      flush();
      const level = heading[1].length;
      headingStack = headingStack.filter((h) => h.level < level);
      headingStack.push({ level, text: heading[2] });
      headingPath = headingStack.map((h) => h.text);
      continue;
    }
    const budget = budgetFor(headingPath);
    const pieces = block.length > budget ? hardSplit(block, budget) : [block];
    for (const piece of pieces) {
      if (bodyLen > 0 && bodyLen + 2 + piece.length > budget) flush();
      bodyBlocks.push(piece);
      bodyLen += (bodyLen > 0 ? 2 : 0) + piece.length;
      if (bodyLen >= budget) flush();
    }
  }
  flush();
  return chunks;
}

export function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function toRagChunks(
  source: CorpusSource,
  slug: string,
  url: string,
  audience: Audience,
  chunks: Chunk[],
): RagChunk[] {
  return chunks.map((chunk, i) => ({
    id: `${source}:${slug}:${i}`,
    text: chunk.text,
    metadata: {
      source,
      slug,
      url,
      audience,
      content_hash: contentHash(chunk.text),
      text: chunk.text,
    },
  }));
}

// ---------------------------------------------------------------------------
// Corpus extraction.
// ---------------------------------------------------------------------------

export async function buildBlogChunks(blogDir = BLOG_DIR): Promise<RagChunk[]> {
  const files = (await readdir(blogDir)).filter((f) => f.endsWith(".mdx")).sort();
  const out: RagChunk[] = [];
  for (const file of files) {
    const raw = await readFile(resolve(blogDir, file), "utf8");
    const { data, content } = matter(raw);
    const slug = typeof data.slug === "string" ? data.slug : file.replace(/\.mdx$/, "");
    const title = typeof data.title === "string" ? data.title : slug;
    const excerpt = typeof data.excerpt === "string" ? `${data.excerpt}\n\n` : "";
    const chunks = chunkMarkdown(`# ${title}\n\n${excerpt}${content}`);
    if (chunks.length === 0) throw new Error(`blog corpus: ${file} produced 0 chunks`);
    out.push(...toRagChunks("blog", slug, `/blog/${slug}`, "public", chunks));
  }
  return out;
}

function renderCourseSection(section: CourseSection): string {
  switch (section.kind) {
    case "intro":
      return `## ${section.heading}\n\n${section.body}`;
    case "example":
      return `## ${section.heading}\n\n${section.commentary}`;
    case "checklist":
      return `## ${section.heading}\n\n${section.items
        .map((item) => `- ${item.good ? "správne" : "nesprávne"}: ${item.text}`)
        .join("\n")}`;
    case "redflags":
      return `## ${section.heading}\n\n${section.flags.map((f) => `- ${f}`).join("\n")}`;
    case "do_dont":
      return `## ${section.heading}\n\nRob:\n${section.do
        .map((d) => `- ${d}`)
        .join("\n")}\n\nNerob:\n${section.dont.map((d) => `- ${d}`).join("\n")}`;
    case "scenario":
      return `## ${section.heading}\n\n${section.story}\n\nSprávny postup: ${section.right_action}`;
  }
}

export function buildCourseChunks(courses: Course[] = COURSES): RagChunk[] {
  const out: RagChunk[] = [];
  for (const course of courses) {
    const markdown = [`# ${course.title}`, course.tagline]
      .concat(course.sections.map(renderCourseSection))
      .join("\n\n");
    const chunks = chunkMarkdown(markdown);
    if (chunks.length === 0) throw new Error(`course corpus: ${course.slug} produced 0 chunks`);
    out.push(...toRagChunks("course", course.slug, `/courses/${course.slug}`, "public", chunks));
  }
  return out;
}

export function buildRouteChunks(catalog: RouteCatalogEntry[] = ROUTE_CATALOG): RagChunk[] {
  return catalog.flatMap((entry) => {
    const slug = entry.path === "/" ? "home" : entry.path.slice(1).replace(/\//g, "-");
    const text = `${entry.title} (${entry.path})\n\n${entry.description}`;
    return toRagChunks("route", slug, entry.path, entry.audience, [
      { text, headingPath: [entry.title] },
    ]);
  });
}

type LegalNode = string | LegalNode[] | { [key: string]: LegalNode };

function legalNodeToMarkdown(node: LegalNode): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(legalNodeToMarkdown);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (["meta_title", "meta_description", "back_home", "back"].includes(key)) continue;
    if (key === "heading" && typeof value === "string") {
      lines.push(`## ${value}`);
      continue;
    }
    lines.push(...legalNodeToMarkdown(value));
  }
  return lines;
}

export function buildLegalChunks(
  legal: Record<string, LegalNode> = skLegal as unknown as Record<string, LegalNode>,
): RagChunk[] {
  const out: RagChunk[] = [];
  for (const [slug, node] of Object.entries(legal)) {
    const markdown = legalNodeToMarkdown(node).join("\n\n");
    const chunks = chunkMarkdown(markdown);
    if (chunks.length === 0) throw new Error(`legal corpus: ${slug} produced 0 chunks`);
    out.push(...toRagChunks("legal", slug, `/${slug}`, "public", chunks));
  }
  return out;
}

export async function buildCorpus(): Promise<RagChunk[]> {
  return [
    ...(await buildBlogChunks()),
    ...buildCourseChunks(),
    ...buildRouteChunks(),
    ...buildLegalChunks(),
  ];
}

// ---------------------------------------------------------------------------
// Audience guards (E53.6 — admin blackout). The build FAILS if any admin
// surface slips into the catalog or the corpus.
// ---------------------------------------------------------------------------

export function validateRouteCatalog(catalog: RouteCatalogEntry[]): void {
  const seen = new Set<string>();
  for (const entry of catalog) {
    if (!entry.path.startsWith("/")) {
      throw new Error(`route catalog: path must start with "/": ${entry.path}`);
    }
    if (entry.path === "/admin" || entry.path.startsWith("/admin/")) {
      throw new Error(`route catalog: admin route is a corpus blackout: ${entry.path}`);
    }
    if (entry.audience !== "public" && entry.audience !== "app") {
      throw new Error(`route catalog: invalid audience "${entry.audience}" on ${entry.path}`);
    }
    if (seen.has(entry.path)) throw new Error(`route catalog: duplicate path ${entry.path}`);
    seen.add(entry.path);
  }
}

export function assertNoAdminLeak(chunks: RagChunk[]): void {
  for (const chunk of chunks) {
    const { audience, url } = chunk.metadata;
    if (audience !== "public" && audience !== "app") {
      throw new Error(`audience guard: chunk ${chunk.id} has forbidden audience "${audience}"`);
    }
    if (url === "/admin" || url.startsWith("/admin/")) {
      throw new Error(`audience guard: chunk ${chunk.id} points at admin URL ${url}`);
    }
  }
}

export function assertDimensionBudget(chunkCount: number): void {
  const stored = chunkCount * EMBEDDING_DIMENSIONS;
  if (stored > MAX_STORED_DIMENSIONS) {
    throw new Error(
      `dimension budget: ${chunkCount} chunks × ${EMBEDDING_DIMENSIONS} dims = ` +
        `${stored.toLocaleString("en-US")} > ${MAX_STORED_DIMENSIONS.toLocaleString("en-US")} ` +
        `(30 % headroom under the 5 M Vectorize free cap). Trim the corpus or raise chunk size.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Sync — hash-diff incremental refresh against injected clients.
// ---------------------------------------------------------------------------

export interface EmbeddingClient {
  embed(texts: string[]): Promise<number[][]>;
}

export interface VectorIndexClient {
  /** Returns id → content_hash for the ids that exist in the index. */
  fetchContentHashes(ids: string[]): Promise<Map<string, string>>;
  upsert(vectors: RagVector[]): Promise<void>;
  deleteByIds(ids: string[]): Promise<void>;
}

export interface SyncResult {
  total: number;
  embedded: number;
  skipped: number;
  deleted: number;
}

export async function syncIndex(
  chunks: RagChunk[],
  embedder: EmbeddingClient,
  index: VectorIndexClient,
  opts: { previousIds?: string[]; batchSize?: number } = {},
): Promise<SyncResult> {
  const batchSize = opts.batchSize ?? 50;
  const existing = await index.fetchContentHashes(chunks.map((c) => c.id));
  const changed = chunks.filter((c) => existing.get(c.id) !== c.metadata.content_hash);

  for (let i = 0; i < changed.length; i += batchSize) {
    const batch = changed.slice(i, i + batchSize);
    const vectors = await embedder.embed(batch.map((c) => c.text));
    if (vectors.length !== batch.length) {
      throw new Error(`embedder returned ${vectors.length} vectors for ${batch.length} texts`);
    }
    await index.upsert(
      batch.map((c, j) => ({ id: c.id, values: vectors[j], metadata: c.metadata })),
    );
  }

  const currentIds = new Set(chunks.map((c) => c.id));
  const stale = (opts.previousIds ?? []).filter((id) => !currentIds.has(id));
  if (stale.length > 0) await index.deleteByIds(stale);

  return {
    total: chunks.length,
    embedded: changed.length,
    skipped: chunks.length - changed.length,
    deleted: stale.length,
  };
}

// ---------------------------------------------------------------------------
// Real Cloudflare REST clients (used only when CF_ACCOUNT_ID + CF_API_TOKEN
// are present — see tasks/E53-runbook.md §1; until the owner creates the
// index, the script runs in plan mode with zero network calls).
// ---------------------------------------------------------------------------

const CF_API_BASE = "https://api.cloudflare.com/client/v4/accounts";

async function cfRequest<T>(
  url: string,
  apiToken: string,
  body: string,
  contentType = "application/json",
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": contentType },
    body,
  });
  if (!res.ok) {
    throw new Error(`Cloudflare API ${url} failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { success: boolean; errors: unknown; result: T };
  if (!json.success) {
    throw new Error(`Cloudflare API ${url} returned errors: ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}

export class WorkersAiEmbeddingClient implements EmbeddingClient {
  constructor(
    private readonly accountId: string,
    private readonly apiToken: string,
    private readonly model = "@cf/baai/bge-m3",
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const result = await cfRequest<{ data: number[][] }>(
      `${CF_API_BASE}/${this.accountId}/ai/run/${this.model}`,
      this.apiToken,
      JSON.stringify({ text: texts }),
    );
    return result.data;
  }
}

export class VectorizeRestClient implements VectorIndexClient {
  private readonly base: string;

  constructor(
    accountId: string,
    private readonly apiToken: string,
    indexName: string,
  ) {
    this.base = `${CF_API_BASE}/${accountId}/vectorize/v2/indexes/${indexName}`;
  }

  async fetchContentHashes(ids: string[]): Promise<Map<string, string>> {
    const hashes = new Map<string, string>();
    for (let i = 0; i < ids.length; i += 100) {
      const result = await cfRequest<Array<{ id: string; metadata?: { content_hash?: string } }>>(
        `${this.base}/get_by_ids`,
        this.apiToken,
        JSON.stringify({ ids: ids.slice(i, i + 100) }),
      );
      for (const vector of result ?? []) {
        if (vector.metadata?.content_hash) hashes.set(vector.id, vector.metadata.content_hash);
      }
    }
    return hashes;
  }

  async upsert(vectors: RagVector[]): Promise<void> {
    const ndjson = vectors.map((v) => JSON.stringify(v)).join("\n");
    await cfRequest(`${this.base}/upsert`, this.apiToken, ndjson, "application/x-ndjson");
  }

  async deleteByIds(ids: string[]): Promise<void> {
    await cfRequest(`${this.base}/delete_by_ids`, this.apiToken, JSON.stringify({ ids }));
  }
}

// ---------------------------------------------------------------------------
// CLI.
// ---------------------------------------------------------------------------

function printStats(chunks: RagChunk[]): void {
  const bySource = new Map<CorpusSource, number>();
  for (const chunk of chunks) {
    bySource.set(chunk.metadata.source, (bySource.get(chunk.metadata.source) ?? 0) + 1);
  }
  for (const [source, count] of bySource) console.log(`  ${source.padEnd(7)} ${count} chunks`);
  const stored = chunks.length * EMBEDDING_DIMENSIONS;
  console.log(
    `  total   ${chunks.length} chunks → ${stored.toLocaleString("en-US")} stored dims ` +
      `(budget ${MAX_STORED_DIMENSIONS.toLocaleString("en-US")})`,
  );
}

async function readManifestIds(): Promise<string[]> {
  if (!existsSync(MANIFEST_PATH)) return [];
  const parsed = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as { ids?: string[] };
  return parsed.ids ?? [];
}

async function main(): Promise<void> {
  const dryRunFlag = process.argv.includes("--dry-run");

  validateRouteCatalog(ROUTE_CATALOG);
  const corpus = await buildCorpus();
  assertNoAdminLeak(corpus);
  assertDimensionBudget(corpus.length);

  console.log("RAG corpus:");
  printStats(corpus);

  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const indexName = process.env.SCAM_CHAT_INDEX_NAME ?? "scam-chat-rag";

  if (dryRunFlag || !accountId || !apiToken) {
    console.log(
      dryRunFlag
        ? "[plan] --dry-run: skipping embed + upsert (0 network calls)."
        : "[plan] CF_ACCOUNT_ID / CF_API_TOKEN not set: skipping embed + upsert " +
            "(0 network calls). See tasks/E53-runbook.md §1 for the real run.",
    );
    return;
  }

  const result = await syncIndex(
    corpus,
    new WorkersAiEmbeddingClient(accountId, apiToken),
    new VectorizeRestClient(accountId, apiToken, indexName),
    { previousIds: await readManifestIds() },
  );
  await writeFile(
    MANIFEST_PATH,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), ids: corpus.map((c) => c.id) }, null, 2)}\n`,
  );
  console.log(
    `Synced "${indexName}": embedded ${result.embedded}, skipped ${result.skipped} ` +
      `(unchanged), deleted ${result.deleted} stale.`,
  );
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
