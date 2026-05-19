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

// ---------------------------------------------------------------------------
// Phase 6 — retest reminders (90 days after a class completed a test).
// ---------------------------------------------------------------------------
export interface RetestReminder {
  id: string;
  test_id: string;
  last_score: number | null;
  sessions_count: number;
  last_session_at: string;
  remind_after: string;
  dismissed_at: string | null;
  snoozed_until: string | null;
  retested_at: string | null;
  test?: { id: string; title: string; status: string } | null;
}

const RETEST_KEY = ["user", "retest_reminders"] as const;

const RETEST_COLS =
  "id, test_id, last_score, sessions_count, last_session_at, remind_after, dismissed_at, snoozed_until, retested_at, test:tests(id, title, status)";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useDueRetestReminders() {
  return useQuery({
    queryKey: [...RETEST_KEY, "due"],
    queryFn: async (): Promise<RetestReminder[]> => {
      const today = todayISO();
      const { data, error } = await supabase
        .from("retest_reminders")
        .select(RETEST_COLS)
        .lte("remind_after", today)
        .is("dismissed_at", null)
        .is("retested_at", null)
        .or(`snoozed_until.is.null,snoozed_until.lte.${today}`)
        .order("remind_after", { ascending: true })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as RetestReminder[];
    },
  });
}

export function useAllRetestReminders() {
  return useQuery({
    queryKey: [...RETEST_KEY, "all"],
    queryFn: async (): Promise<RetestReminder[]> => {
      const { data, error } = await supabase
        .from("retest_reminders")
        .select(RETEST_COLS)
        .is("dismissed_at", null)
        .is("retested_at", null)
        .order("remind_after", { ascending: true })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as RetestReminder[];
    },
  });
}

function useRetestTimestampMutation(column: "dismissed_at" | "retested_at") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("retest_reminders")
        .update({ [column]: new Date().toISOString() })
        .eq("id", reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RETEST_KEY });
    },
  });
}

export function useDismissRetest() {
  return useRetestTimestampMutation("dismissed_at");
}

export function useMarkRetested() {
  return useRetestTimestampMutation("retested_at");
}

export function useSnoozeRetest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reminderId: string) => {
      const snoozedUntil = new Date();
      snoozedUntil.setDate(snoozedUntil.getDate() + 30);
      const { error } = await supabase
        .from("retest_reminders")
        .update({ snoozed_until: snoozedUntil.toISOString().slice(0, 10) })
        .eq("id", reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RETEST_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Phase 7a — peer comparison card (user audience vs. anonymous cohort).
// ---------------------------------------------------------------------------
export interface PeerCardBranchRank {
  branch_slug: string;
  user_score: number;
  cohort_score: number | null;
}

export interface PeerCardData {
  has_data: boolean;
  reason?: "insufficient_cohort" | "no_user_data" | "no_user";
  user_score?: number;
  user_attempts?: number;
  user_percentile?: number;
  cohort_avg?: number;
  cohort_size?: number;
  branch_ranks?: PeerCardBranchRank[];
}

export function usePeerCard() {
  return useQuery({
    queryKey: ["user", "peer_card"],
    queryFn: async (): Promise<PeerCardData> => {
      const { data, error } = await supabase.rpc("get_peer_card", { p_user_id: undefined });
      if (error) throw error;
      return (data ?? { has_data: false }) as unknown as PeerCardData;
    },
    staleTime: 1000 * 60 * 60,
  });
}
