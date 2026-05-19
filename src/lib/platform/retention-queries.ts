// Phase 4-7 of /app redesign — retention-loop queries.
//
// Lives in its own module so the lazy retention routes + the dashboard
// retention cards can import it without dragging it into anything that
// loads on cold start. Hooks for sidebar badges stay in `queries.ts` so
// the entry chunk doesn't grow with retention surfaces.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface DigestStats {
  sessions_count?: number;
  completion_rate?: number;
  top_test_id?: string;
  top_test_title?: string;
  weakest_question_text?: string;
  weakest_question_score?: number;
  new_courses?: string[];
  retest_suggestions?: string[];
}

export interface UserDigest {
  id: string;
  period_start: string;
  period_end: string;
  stats: DigestStats;
  generated_at: string;
  opened_at: string | null;
}

type UserDigestRow = {
  id: string;
  period_start: string;
  period_end: string;
  stats: unknown;
  generated_at: string;
  opened_at: string | null;
};

const DIGEST_COLS = "id, period_start, period_end, stats, generated_at, opened_at";

const mapDigest = (row: UserDigestRow): UserDigest => ({
  id: row.id,
  period_start: row.period_start,
  period_end: row.period_end,
  stats: (row.stats ?? {}) as DigestStats,
  generated_at: row.generated_at,
  opened_at: row.opened_at,
});

export function useLatestDigest() {
  return useQuery({
    queryKey: ["user", "digest", "latest"],
    queryFn: async (): Promise<UserDigest | null> => {
      const { data, error } = await supabase
        .from("user_digests")
        .select(DIGEST_COLS)
        .order("period_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? mapDigest(data as UserDigestRow) : null;
    },
  });
}

export function useDigestList() {
  return useQuery({
    queryKey: ["user", "digest", "list"],
    queryFn: async (): Promise<UserDigest[]> => {
      const { data, error } = await supabase
        .from("user_digests")
        .select(DIGEST_COLS)
        .order("period_start", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []).map((r) => mapDigest(r as UserDigestRow));
    },
  });
}

export function useMarkDigestOpened() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (digestId: string) => {
      const { error } = await supabase
        .from("user_digests")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", digestId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "digest"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Phase 5 — course recommendations.
// ---------------------------------------------------------------------------
export interface CourseRecommendation {
  id: string;
  training_id: string;
  reason_key: "low_score_branch" | "new_content" | "peer_popular";
  score_at_rec: number | null;
  branch_slug: string | null;
  dismissed_at: string | null;
  clicked_at: string | null;
  sent_at: string | null;
  created_at: string;
  training?: {
    id: string;
    title: string;
    slug: string | null;
    estimated_minutes: number | null;
  } | null;
}

const COURSE_REC_KEY = ["user", "course_recommendations"] as const;

export function useCourseRecommendations() {
  return useQuery({
    queryKey: COURSE_REC_KEY,
    queryFn: async (): Promise<CourseRecommendation[]> => {
      const { data, error } = await supabase
        .from("course_recommendations")
        .select(
          "id, training_id, reason_key, score_at_rec, branch_slug, dismissed_at, clicked_at, sent_at, created_at, training:trainings(id, title, slug, estimated_minutes)",
        )
        .is("dismissed_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as CourseRecommendation[];
    },
  });
}

function useRecommendationTimestampMutation(column: "dismissed_at" | "clicked_at" | "sent_at") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recId: string) => {
      const { error } = await supabase
        .from("course_recommendations")
        .update({ [column]: new Date().toISOString() })
        .eq("id", recId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COURSE_REC_KEY });
    },
  });
}

export function useDismissRecommendation() {
  return useRecommendationTimestampMutation("dismissed_at");
}

export function useClickRecommendation() {
  return useRecommendationTimestampMutation("clicked_at");
}

export function useMarkRecommendationSent() {
  return useRecommendationTimestampMutation("sent_at");
}
