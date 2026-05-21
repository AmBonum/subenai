// E37 Phase F — DB-backed reads for the /tests catalog + /tests/$slug
// detail page. Sister module to `src/lib/platform/queries.ts`, scoped
// narrowly to the two RPCs landed in Phase B' (PR #123):
//
//   public.get_platform_packs()                — anon-safe catalog list
//   public.get_pack_with_questions(p_slug text) — anon-safe detail payload
//
// The functions exported here are async (not React Query hooks) so they
// can run inside TanStack Start `loader`s during SSR. A thin client-side
// hook wrapper is also exported for components that don't sit under a
// loader (e.g. RelatedTestPacks navigations after the initial SSR).
//
// Output shape: both fetchers return objects matching the existing
// `TestPack` static shape (`src/content/test-packs/_schema.ts`). That
// keeps TestPackCard / RelatedTestPacks / INDUSTRY_LABEL untouched in
// Phase F. The Industry TS union is extended in this PR with 4 new
// variants used only by DB packs (heslo_2fa, ai_deepfake,
// socialne_siete, rodicia). Phase G will delete the static layer +
// rename `questionIds` to `questionCount`.

import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { TestPack, Industry } from "@/content/test-packs";
import type { Option, Question, Visual } from "@/lib/quiz/bank/questions";
import { mapDbRowToQuestion } from "@/lib/quiz/from-db";
import type { QuickTestQuestionRow } from "@/lib/platform/queries";

// ---------------------------------------------------------------------------
// Catalog list — public.get_platform_packs()
// ---------------------------------------------------------------------------

interface PlatformPackRpcRow {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  industry: string;
  industry_emoji: string;
  passing_threshold: number;
  question_count: number;
  published_at: string | null;
}

// Catalog rows only carry the question COUNT, not the IDs. We hydrate
// `questionIds` as a fixed-length empty array purely so that downstream
// `pack.questionIds.length` reads (TestPackCard's meta line, /tests
// catalog sort-by-depth) keep working without component changes. The
// synthetic IDs are never read individually — TestPackCard never iterates
// them, only reads `.length`. Audited 2026-05-21.
//
// Phase G will replace this with an explicit `questionCount: number`
// field once the static layer is removed and the codebase no longer
// needs the `questionIds: string[]` shape for the static manifest.
function toTestPackSummary(row: PlatformPackRpcRow): TestPack {
  return {
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    industry: row.industry as Industry,
    industryEmoji: row.industry_emoji,
    // Catalog list doesn't carry persona/sources; detail RPC does.
    targetPersona: "",
    questionIds: Array.from({ length: row.question_count }, () => ""),
    passingThreshold: row.passing_threshold,
    publishedAt: row.published_at ?? "",
    updatedAt: row.published_at ?? "",
  };
}

export async function fetchPlatformPacks(): Promise<TestPack[]> {
  const { data, error } = await supabase.rpc("get_platform_packs");
  if (error) throw error;
  const rows = (data ?? []) as unknown as PlatformPackRpcRow[];
  return rows.map(toTestPackSummary);
}

// ---------------------------------------------------------------------------
// Detail payload — public.get_pack_with_questions(p_slug)
// ---------------------------------------------------------------------------

interface PackQuestionRpcRow {
  id: string;
  type: string;
  prompt: string;
  options: Option[];
  correct: number[];
  branch_slug: string;
  difficulty: string;
  visual: Visual | null;
  position: number;
}

interface PackWithQuestionsRpcPayload {
  pack: {
    id: string;
    slug: string;
    title: string;
    tagline: string;
    industry: string;
    industry_emoji: string;
    target_persona: string;
    sources: { label: string; url: string; publisher?: string; accessed_at?: string }[];
    passing_threshold: number;
    published_at: string | null;
  };
  questions: PackQuestionRpcRow[];
}

export interface PlatformPackWithQuestions {
  pack: TestPack;
  questions: Question[];
}

export async function fetchPackWithQuestions(
  slug: string,
): Promise<PlatformPackWithQuestions | null> {
  const { data, error } = await supabase.rpc("get_pack_with_questions", { p_slug: slug });
  if (error) throw error;
  if (!data) return null;
  // The RPC returns NULL for unknown / unpublished slugs — typed as
  // `Json` by supabase-js, so a runtime check + cast.
  const payload = data as unknown as PackWithQuestionsRpcPayload;

  const pack: TestPack = {
    slug: payload.pack.slug,
    title: payload.pack.title,
    tagline: payload.pack.tagline,
    industry: payload.pack.industry as Industry,
    industryEmoji: payload.pack.industry_emoji,
    targetPersona: payload.pack.target_persona,
    questionIds: Array.from({ length: payload.questions.length }, () => ""),
    passingThreshold: payload.pack.passing_threshold,
    publishedAt: payload.pack.published_at ?? "",
    updatedAt: payload.pack.published_at ?? "",
    sources: payload.pack.sources?.map((s) => ({ label: s.label, url: s.url })),
  };

  const questions: Question[] = payload.questions.map((row) =>
    mapDbRowToQuestion({
      id: row.id,
      type: row.type,
      prompt: row.prompt,
      options: row.options,
      correct: row.correct,
      branch_slug: row.branch_slug,
      difficulty: row.difficulty,
      visual: row.visual,
      // mapDbRowToQuestion expects QuickTestQuestionRow shape
      // (order_index, not position). Same data, different field name.
      order_index: row.position,
    } as QuickTestQuestionRow),
  );

  return { pack, questions };
}

// ---------------------------------------------------------------------------
// Client-side hook wrappers (TanStack Query) — used by components that
// don't sit under a route loader, e.g. RelatedTestPacks. The cache key
// matches the loader fetcher so SSR-prefetched data dehydrates cleanly.
// ---------------------------------------------------------------------------

export function usePlatformPacks() {
  return useQuery<TestPack[]>({
    queryKey: ["platform", "packs"],
    queryFn: fetchPlatformPacks,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function usePackWithQuestions(slug: string | undefined) {
  return useQuery<PlatformPackWithQuestions | null>({
    queryKey: ["platform", "pack", slug],
    queryFn: () => (slug ? fetchPackWithQuestions(slug) : Promise.resolve(null)),
    enabled: !!slug,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
