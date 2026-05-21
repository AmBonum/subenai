// E37 Phase F follow-up — unit coverage for the pack-queries module
// that shipped in PR #124. Mocks `supabase.rpc` so the assertions run
// in isolation; the mapping logic (DB row → TestPack-shaped object,
// pack-with-questions payload → { pack, questions }) is what we're
// verifying. The RPCs themselves are contract-tested separately at
// `tests/db/e37_platform_packs.test.ts`.

import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { fetchPlatformPacks, fetchPackWithQuestions } from "@/lib/platform/pack-queries";

describe("fetchPlatformPacks — catalog list mapping", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("calls public.get_platform_packs() with no args", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await fetchPlatformPacks();
    expect(rpcMock).toHaveBeenCalledWith("get_platform_packs");
  });

  it("maps DB rows to TestPack-shaped objects (snake_case → camelCase)", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: "uuid-1",
          slug: "heslo-2fa",
          title: "Heslá a 2FA",
          tagline: "tag",
          industry: "heslo_2fa",
          industry_emoji: "🔐",
          passing_threshold: 75,
          question_count: 7,
          published_at: "2026-05-15T00:00:00Z",
        },
      ],
      error: null,
    });
    const packs = await fetchPlatformPacks();
    expect(packs).toHaveLength(1);
    expect(packs[0]).toMatchObject({
      slug: "heslo-2fa",
      title: "Heslá a 2FA",
      tagline: "tag",
      industry: "heslo_2fa",
      industryEmoji: "🔐",
      passingThreshold: 75,
      publishedAt: "2026-05-15T00:00:00Z",
      updatedAt: "2026-05-15T00:00:00Z",
    });
  });

  it("populates questionIds as a fixed-length empty array (the .length-only contract)", async () => {
    // The catalog RPC carries `question_count` but not the actual IDs.
    // Downstream code (TestPackCard) reads `pack.questionIds.length`,
    // so the synthetic array preserves that contract. This sentinel
    // catches a regression where pack-queries starts returning a real
    // ID array (which would silently change the .length semantics if
    // unique IDs were ever expected — they aren't here).
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          slug: "x",
          title: "X",
          tagline: "x",
          industry: "vseobecny",
          industry_emoji: "🌐",
          passing_threshold: 70,
          question_count: 14,
          published_at: null,
        },
      ],
      error: null,
    });
    const [pack] = await fetchPlatformPacks();
    expect(pack.questionIds).toHaveLength(14);
    expect(pack.questionIds.every((id) => id === "")).toBe(true);
  });

  it("treats null published_at as empty-string publishedAt + updatedAt", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          slug: "draft",
          title: "Draft",
          tagline: "",
          industry: "vseobecny",
          industry_emoji: "🌐",
          passing_threshold: 70,
          question_count: 0,
          published_at: null,
        },
      ],
      error: null,
    });
    const [pack] = await fetchPlatformPacks();
    expect(pack.publishedAt).toBe("");
    expect(pack.updatedAt).toBe("");
  });

  it("treats null data as empty array (anon RLS edge case mirrors useQuickTestQuestions)", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    expect(await fetchPlatformPacks()).toEqual([]);
  });

  it("throws on RPC error so the loader's notFound() never silently fires", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "rls denied" } });
    await expect(fetchPlatformPacks()).rejects.toBeTruthy();
  });
});

describe("fetchPackWithQuestions — detail payload mapping", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("calls public.get_pack_with_questions with the requested slug", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await fetchPackWithQuestions("heslo-2fa");
    expect(rpcMock).toHaveBeenCalledWith("get_pack_with_questions", { p_slug: "heslo-2fa" });
  });

  it("returns null when the RPC payload is NULL (unknown / unpublished slug)", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    expect(await fetchPackWithQuestions("nonexistent")).toBeNull();
  });

  it("throws on RPC error", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(fetchPackWithQuestions("x")).rejects.toBeTruthy();
  });

  it("maps the pack metadata + question rows + sources jsonb", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        pack: {
          id: "pack-uuid",
          slug: "ai-deepfake",
          title: "AI a deepfake",
          tagline: "tag",
          industry: "ai_deepfake",
          industry_emoji: "🤖",
          target_persona: "persona",
          sources: [{ label: "SK-CERT", url: "https://www.sk-cert.sk/", publisher: "SK-CERT" }],
          passing_threshold: 70,
          published_at: "2026-05-15T00:00:00Z",
        },
        questions: [
          {
            id: "q-1",
            type: "single",
            prompt: "?",
            options: [{ id: "a", label: "Áno", correct: true, severity: null }],
            correct: [0],
            branch_slug: "phishing",
            difficulty: "easy",
            visual: null,
            position: 0,
          },
        ],
      },
      error: null,
    });
    const result = await fetchPackWithQuestions("ai-deepfake");
    expect(result).not.toBeNull();
    expect(result!.pack).toMatchObject({
      slug: "ai-deepfake",
      industry: "ai_deepfake",
      industryEmoji: "🤖",
      targetPersona: "persona",
      passingThreshold: 70,
    });
    expect(result!.pack.sources).toEqual([{ label: "SK-CERT", url: "https://www.sk-cert.sk/" }]);
    // Phase F contract: questionIds is a synthetic array sized to the
    // question payload, not the real DB UUIDs. The real IDs live on
    // the `questions` field after mapDbRowToQuestion runs.
    expect(result!.pack.questionIds).toHaveLength(1);
    expect(result!.questions).toHaveLength(1);
    expect(result!.questions[0]).toMatchObject({
      id: "q-1",
      prompt: "?",
      category: "phishing", // branch_slug normalised by mapDbRowToQuestion
    });
  });

  it("drops the publisher / accessed_at fields from sources (only label + url surface to the UI)", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        pack: {
          id: "p",
          slug: "x",
          title: "X",
          tagline: "",
          industry: "vseobecny",
          industry_emoji: "🌐",
          target_persona: "",
          sources: [
            {
              label: "Source",
              url: "https://example.org/",
              publisher: "Pub",
              accessed_at: "2026-05-21",
            },
          ],
          passing_threshold: 70,
          published_at: null,
        },
        questions: [],
      },
      error: null,
    });
    const result = await fetchPackWithQuestions("x");
    expect(result!.pack.sources).toEqual([{ label: "Source", url: "https://example.org/" }]);
  });
});
