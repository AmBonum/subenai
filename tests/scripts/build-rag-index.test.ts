import { describe, it, expect, vi } from "vitest";

import {
  chunkMarkdown,
  contentHash,
  buildBlogChunks,
  buildCourseChunks,
  buildRouteChunks,
  buildLegalChunks,
  validateRouteCatalog,
  assertNoAdminLeak,
  assertDimensionBudget,
  syncIndex,
  EMBEDDING_DIMENSIONS,
  MAX_STORED_DIMENSIONS,
  DEFAULT_MAX_CHUNK_CHARS,
  BLOG_DIR,
  type RagChunk,
  type EmbeddingClient,
  type VectorIndexClient,
  type RagVector,
} from "../../scripts/build-rag-index";
import { COURSES } from "@/content/courses";
import {
  ROUTE_CATALOG,
  type RouteCatalogEntry,
} from "../../functions/_lib/scam-chat/route-catalog";

const ragChunk = (id: string, text: string, overrides: Partial<RagChunk["metadata"]> = {}) => ({
  id,
  text,
  metadata: {
    source: "blog" as const,
    slug: "x",
    url: "/blog/x",
    audience: "public" as const,
    content_hash: contentHash(text),
    text,
    ...overrides,
  },
});

function mockIndex(existing: Map<string, string> = new Map()) {
  const upserted: RagVector[][] = [];
  const deleted: string[][] = [];
  const index: VectorIndexClient = {
    fetchContentHashes: vi.fn(async () => existing),
    upsert: vi.fn(async (vectors: RagVector[]) => {
      upserted.push(vectors);
    }),
    deleteByIds: vi.fn(async (ids: string[]) => {
      deleted.push(ids);
    }),
  };
  return { index, upserted, deleted };
}

function mockEmbedder() {
  const calls: string[][] = [];
  const embedder: EmbeddingClient = {
    embed: vi.fn(async (texts: string[]) => {
      calls.push(texts);
      return texts.map(() => [0.1, 0.2, 0.3]);
    }),
  };
  return { embedder, calls };
}

describe("chunkMarkdown", () => {
  it("never lets a chunk span a heading boundary", () => {
    const md = "## Prvá sekcia\n\nObsah prvej sekcie.\n\n## Druhá sekcia\n\nObsah druhej sekcie.";
    const chunks = chunkMarkdown(md);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].text).toContain("Obsah prvej sekcie.");
    expect(chunks[0].text).not.toContain("druhej");
    expect(chunks[1].headingPath).toEqual(["Druhá sekcia"]);
  });

  it("tracks nested heading paths", () => {
    const md = "# Titul\n\n## Sekcia\n\n### Podsekcia\n\nText.\n\n## Iná sekcia\n\nĎalší text.";
    const chunks = chunkMarkdown(md);
    expect(chunks[0].headingPath).toEqual(["Titul", "Sekcia", "Podsekcia"]);
    expect(chunks[1].headingPath).toEqual(["Titul", "Iná sekcia"]);
  });

  it("respects the max chunk size, including the heading prefix", () => {
    const paragraphs = Array.from({ length: 30 }, (_, i) => `Veta číslo ${i} o podvodoch.`);
    const md = `## Dlhá sekcia\n\n${paragraphs.join("\n\n")}`;
    const chunks = chunkMarkdown(md, 200);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(200);
  });

  it("hard-splits a single block longer than the budget", () => {
    const block = Array.from({ length: 50 }, () => "Toto je dlhá veta o phishingu.").join(" ");
    const chunks = chunkMarkdown(block, 300);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(300);
    expect(chunks.map((c) => c.text).join(" ")).toContain("phishingu");
  });

  it("drops MDX import/export module lines", () => {
    const md = 'import { X } from "./x";\n\nSkutočný obsah.';
    const chunks = chunkMarkdown(md);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("Skutočný obsah.");
  });

  it("is deterministic — identical input yields identical chunks and hashes", () => {
    const md = "## Sekcia\n\nStabilný obsah o podvodných SMS.";
    const a = chunkMarkdown(md).map((c) => contentHash(c.text));
    const b = chunkMarkdown(md).map((c) => contentHash(c.text));
    expect(a).toEqual(b);
    expect(contentHash("iný obsah")).not.toBe(a[0]);
  });
});

describe("corpus extraction (real content, no network)", () => {
  it("covers all 81 blog articles with public audience", async () => {
    const chunks = await buildBlogChunks(BLOG_DIR);
    const slugs = new Set(chunks.map((c) => c.metadata.slug));
    expect(slugs.size).toBe(81);
    for (const chunk of chunks) {
      expect(chunk.metadata.audience).toBe("public");
      expect(chunk.metadata.url).toBe(`/blog/${chunk.metadata.slug}`);
      expect(chunk.text.length).toBeLessThanOrEqual(DEFAULT_MAX_CHUNK_CHARS);
    }
  });

  it("covers every registered course", () => {
    const chunks = buildCourseChunks();
    const slugs = new Set(chunks.map((c) => c.metadata.slug));
    expect(slugs.size).toBe(COURSES.length);
    for (const course of COURSES) expect(slugs.has(course.slug)).toBe(true);
    for (const chunk of chunks) expect(chunk.metadata.audience).toBe("public");
  });

  it("covers both public legal pages", () => {
    const chunks = buildLegalChunks();
    const urls = new Set(chunks.map((c) => c.metadata.url));
    expect(urls).toEqual(new Set(["/privacy", "/cookies"]));
    for (const chunk of chunks) expect(chunk.metadata.audience).toBe("public");
  });

  it("tags route chunks with the catalog audience", () => {
    const chunks = buildRouteChunks();
    expect(chunks).toHaveLength(ROUTE_CATALOG.length);
    const byUrl = new Map(chunks.map((c) => [c.metadata.url, c]));
    for (const entry of ROUTE_CATALOG) {
      const chunk = byUrl.get(entry.path);
      expect(chunk?.metadata.audience).toBe(entry.audience);
      expect(chunk?.text).toContain(entry.title);
      expect(chunk?.text).toContain(entry.description);
    }
  });

  it("keeps the full corpus inside the stored-dimension budget with unique ids", async () => {
    const corpus = [
      ...(await buildBlogChunks(BLOG_DIR)),
      ...buildCourseChunks(),
      ...buildRouteChunks(),
      ...buildLegalChunks(),
    ];
    expect(new Set(corpus.map((c) => c.id)).size).toBe(corpus.length);
    expect(corpus.length * EMBEDDING_DIMENSIONS).toBeLessThanOrEqual(MAX_STORED_DIMENSIONS);
    expect(() => assertNoAdminLeak(corpus)).not.toThrow();
  });
});

describe("admin blackout guards", () => {
  it("rejects a chunk whose URL points into /admin", () => {
    const chunks = [ragChunk("route:admin-users:0", "x", { url: "/admin/users" })];
    expect(() => assertNoAdminLeak(chunks)).toThrow(/admin URL/);
  });

  it("rejects a chunk with a forbidden audience", () => {
    const chunks = [ragChunk("blog:x:0", "x", { audience: "admin" as unknown as "public" })];
    expect(() => assertNoAdminLeak(chunks)).toThrow(/forbidden audience/);
  });

  it("does not reject the /administrativa false positive", () => {
    const chunks = [ragChunk("blog:administrativa:0", "x", { url: "/blog/administrativa" })];
    expect(() => assertNoAdminLeak(chunks)).not.toThrow();
  });

  it("fails the catalog validation on an /admin path", () => {
    const bad: RouteCatalogEntry[] = [
      { path: "/admin/users", title: "x", description: "y", audience: "public" },
    ];
    expect(() => validateRouteCatalog(bad)).toThrow(/blackout/);
  });

  it("fails the catalog validation on duplicates and bad audiences", () => {
    expect(() =>
      validateRouteCatalog([
        { path: "/a", title: "x", description: "y", audience: "public" },
        { path: "/a", title: "x", description: "y", audience: "public" },
      ]),
    ).toThrow(/duplicate/);
    expect(() =>
      validateRouteCatalog([
        { path: "/a", title: "x", description: "y", audience: "admin" as unknown as "public" },
      ]),
    ).toThrow(/invalid audience/);
  });
});

describe("dimension budget", () => {
  it("allows exactly the budget and rejects one chunk over", () => {
    const maxChunks = Math.floor(MAX_STORED_DIMENSIONS / EMBEDDING_DIMENSIONS);
    expect(() => assertDimensionBudget(maxChunks)).not.toThrow();
    expect(() => assertDimensionBudget(maxChunks + 1)).toThrow(/dimension budget/);
  });
});

describe("syncIndex incremental refresh", () => {
  const chunkA = ragChunk("blog:a:0", "obsah A", { slug: "a", url: "/blog/a" });
  const chunkB = ragChunk("blog:b:0", "obsah B", { slug: "b", url: "/blog/b" });

  it("performs 0 embed calls when nothing changed", async () => {
    const existing = new Map([
      [chunkA.id, chunkA.metadata.content_hash],
      [chunkB.id, chunkB.metadata.content_hash],
    ]);
    const { index, upserted } = mockIndex(existing);
    const { embedder } = mockEmbedder();

    const result = await syncIndex([chunkA, chunkB], embedder, index);

    expect(result).toEqual({ total: 2, embedded: 0, skipped: 2, deleted: 0 });
    expect(embedder.embed).not.toHaveBeenCalled();
    expect(upserted).toHaveLength(0);
  });

  it("re-embeds only chunks whose content hash changed", async () => {
    const existing = new Map([
      [chunkA.id, chunkA.metadata.content_hash],
      [chunkB.id, "stale-hash"],
    ]);
    const { index, upserted } = mockIndex(existing);
    const { embedder, calls } = mockEmbedder();

    const result = await syncIndex([chunkA, chunkB], embedder, index);

    expect(result).toEqual({ total: 2, embedded: 1, skipped: 1, deleted: 0 });
    expect(calls).toEqual([["obsah B"]]);
    expect(upserted.flat().map((v) => v.id)).toEqual([chunkB.id]);
    expect(upserted.flat()[0].metadata.content_hash).toBe(chunkB.metadata.content_hash);
  });

  it("embeds everything on a cold index and batches calls", async () => {
    const { index, upserted } = mockIndex();
    const { embedder, calls } = mockEmbedder();
    const many = Array.from({ length: 5 }, (_, i) =>
      ragChunk(`blog:c${i}:0`, `obsah ${i}`, { slug: `c${i}`, url: `/blog/c${i}` }),
    );

    const result = await syncIndex(many, embedder, index, { batchSize: 2 });

    expect(result.embedded).toBe(5);
    expect(calls.map((c) => c.length)).toEqual([2, 2, 1]);
    expect(upserted.flat()).toHaveLength(5);
  });

  it("deletes ids that disappeared from the corpus", async () => {
    const existing = new Map([[chunkA.id, chunkA.metadata.content_hash]]);
    const { index, deleted } = mockIndex(existing);
    const { embedder } = mockEmbedder();

    const result = await syncIndex([chunkA], embedder, index, {
      previousIds: [chunkA.id, "blog:gone:0"],
    });

    expect(result.deleted).toBe(1);
    expect(deleted).toEqual([["blog:gone:0"]]);
  });
});
