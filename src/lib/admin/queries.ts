// TanStack Query hooks for the admin domain. AH-11.1a foundation — no
// consumers in this commit; AH-11.1b swaps consumers one domain at a time.
//
// All reads use the anon Supabase client (`@/integrations/supabase/client`).
// RLS enforces admin/moderator access; rows leak to anon users only when the
// policy explicitly allows it.
//
// Query key convention: ["admin", <domain>, ...filters?]. Mutations invalidate
// the matching ["admin", <domain>] root.
//
// Schema mappers fill UI fields the DB does not have today with sensible
// defaults marked `TODO: derive when AH-12 schema enrichment lands`. They
// allow the admin UI to render against real data without a migration.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import type {
  AdminActivityEvent,
  AdminAnswer,
  AdminAnswerSet,
  AdminCategory,
  AdminDashboardStats,
  AdminQuestion,
  AdminReport,
  AdminTest,
  AdminTopic,
  AdminTraining,
  AdminUser,
  QuestionStatus,
  ReportStatus,
  TestStatus,
  TrainingStatus,
} from "./types";

// ---------------------------------------------------------------------------
// Mappers — DB row → UI shape
// ---------------------------------------------------------------------------

type QuestionsRow = {
  id: string;
  prompt: string;
  branch_slug: string | null;
  author_id: string | null;
  status: string;
  answer_set_id: string | null;
  created_at: string;
};

const mapQuestion = (row: QuestionsRow): AdminQuestion => {
  const prompt = row.prompt ?? "";
  const firstLine = prompt.split("\n")[0] ?? prompt;
  return {
    id: row.id,
    title: firstLine,
    excerpt: prompt.slice(0, 140),
    body: prompt,
    author_id: row.author_id ?? "",
    // TODO: derive when AH-12 schema enrichment lands (join profiles)
    author_name: "",
    categories: row.branch_slug ? [row.branch_slug] : [],
    status: (row.status as QuestionStatus) ?? "pending",
    // TODO: derive when AH-12 schema enrichment lands
    answers_count: 0,
    votes: 0,
    reports_count: 0,
    created_at: row.created_at,
    answer_set_id: row.answer_set_id ?? undefined,
    correct_answer_ids: [],
    incorrect_answer_ids: [],
  };
};

type AnswerSetsRow = {
  id: string;
  name: string;
  description: string | null;
  branch_slugs: string[];
  created_at: string;
  updated_at: string;
};

const mapAnswerSet = (row: AnswerSetsRow): AdminAnswerSet => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  categories: row.branch_slugs ?? [],
  created_at: row.created_at,
  updated_at: row.updated_at,
});

type AnswersRow = {
  id: string;
  set_id: string;
  text: string;
  is_correct: boolean;
  explanation: string | null;
};

const mapAnswer = (row: AnswersRow): AdminAnswer => ({
  id: row.id,
  set_id: row.set_id,
  text: row.text,
  is_correct: row.is_correct,
  explanation: row.explanation ?? undefined,
  // TODO: derive when AH-12 schema enrichment lands (answers.created_at column)
  created_at: new Date(0).toISOString(),
});

type TestsRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  updated_at: string;
};

const mapTest = (row: TestsRow): AdminTest => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  description: row.description ?? "",
  // TODO: derive when AH-12 schema enrichment lands
  categories: [],
  difficulty: "medium",
  status: (row.status as TestStatus) ?? "draft",
  time_limit_min: 0,
  pass_score: 60,
  is_quick: false,
  question_ids: [],
  attempts: 0,
  updated_at: row.updated_at,
});

type CategoriesRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
};

const mapCategory = (row: CategoriesRow): AdminCategory => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? "",
  color: row.color ?? "#64748b",
  // TODO: derive when AH-12 schema enrichment lands
  questions_count: 0,
});

type TopicsRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
};

const mapTopic = (row: TopicsRow): AdminTopic => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? "",
  color: row.color ?? "#64748b",
  // TODO: derive when AH-12 schema enrichment lands
  trainings_count: 0,
});

type TrainingsRow = {
  id: string;
  title: string;
  description: string | null;
  topic_slug: string | null;
  status: string;
  created_at: string;
};

const mapTraining = (row: TrainingsRow): AdminTraining => ({
  id: row.id,
  title: row.title,
  topic: row.topic_slug ?? "vseobecne",
  description: row.description ?? "",
  // TODO: derive when AH-12 schema enrichment lands
  duration_min: 0,
  status: (row.status as TrainingStatus) ?? "draft",
  views: 0,
  updated_at: row.created_at,
});

type ReportsRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
};

const mapReport = (row: ReportsRow): AdminReport => ({
  id: row.id,
  target_type: row.target_type as AdminReport["target_type"],
  target_id: row.target_id,
  // TODO: derive when AH-12 schema enrichment lands (join target row)
  target_label: row.target_id,
  reason: row.reason as AdminReport["reason"],
  status: row.status as ReportStatus,
  reporter_name: "",
  created_at: row.created_at,
});

type RespondentsRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  anonymized_at: string | null;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  pii_access: boolean;
  details: string | null;
  at: string;
};

type DsrRequestsRow = {
  id: string;
  requester_email: string;
  type: string;
  status: string;
  note: string | null;
  created_at: string;
  sla_due_at: string;
  resolved_at: string | null;
};

type ProfilesRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

type UserRolesRow = { user_id: string; role: string };

const mapUser = (profile: ProfilesRow, role?: string): AdminUser => ({
  id: profile.id,
  email: profile.email ?? "",
  display_name: profile.display_name ?? profile.email ?? "",
  role: (role as AdminUser["role"]) ?? "user",
  // TODO: derive when AH-12 schema enrichment lands
  status: "active",
  questions_count: 0,
  created_at: profile.created_at,
  last_active_at: profile.created_at,
});

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export function useAdminQuestions() {
  return useQuery({
    queryKey: ["admin", "questions"],
    queryFn: async (): Promise<AdminQuestion[]> => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, prompt, branch_slug, author_id, status, answer_set_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapQuestion(r as QuestionsRow));
    },
  });
}

export function useAdminQuestion(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "questions", id],
    enabled: !!id,
    queryFn: async (): Promise<AdminQuestion | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("questions")
        .select("id, prompt, branch_slug, author_id, status, answer_set_id, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapQuestion(data as QuestionsRow) : null;
    },
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AdminQuestion>) => {
      const prompt = input.body ?? input.title ?? "";
      const { data, error } = await supabase
        .from("questions")
        .insert({
          type: "single",
          prompt,
          branch_slug: input.categories?.[0] ?? null,
          status: (input.status ?? "draft") as never,
          answer_set_id: input.answer_set_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "questions"] }),
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AdminQuestion> }) => {
      const update: Record<string, unknown> = {};
      if (patch.body !== undefined) update.prompt = patch.body;
      else if (patch.title !== undefined) update.prompt = patch.title;
      if (patch.categories) update.branch_slug = patch.categories[0] ?? null;
      if (patch.status) update.status = patch.status;
      if (patch.answer_set_id !== undefined) update.answer_set_id = patch.answer_set_id;
      const { error } = await supabase.from("questions").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "questions"] }),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "questions"] }),
  });
}

// ---------------------------------------------------------------------------
// Answer sets + answers
// ---------------------------------------------------------------------------

export function useAdminAnswerSets() {
  return useQuery({
    queryKey: ["admin", "answer_sets"],
    queryFn: async (): Promise<AdminAnswerSet[]> => {
      const { data, error } = await supabase
        .from("answer_sets")
        .select("id, name, description, branch_slugs, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapAnswerSet(r as AnswerSetsRow));
    },
  });
}

export function useAdminAnswers() {
  return useQuery({
    queryKey: ["admin", "answers"],
    queryFn: async (): Promise<AdminAnswer[]> => {
      const { data, error } = await supabase
        .from("answers")
        .select("id, set_id, text, is_correct, explanation");
      if (error) throw error;
      return (data ?? []).map((r) => mapAnswer(r as AnswersRow));
    },
  });
}

export function useAdminAnswerSet(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "answer_sets", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const [setRes, ansRes] = await Promise.all([
        supabase
          .from("answer_sets")
          .select("id, name, description, branch_slugs, created_at, updated_at")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("answers")
          .select("id, set_id, text, is_correct, explanation")
          .eq("set_id", id)
          .order("position", { ascending: true }),
      ]);
      if (setRes.error) throw setRes.error;
      if (ansRes.error) throw ansRes.error;
      return {
        set: setRes.data ? mapAnswerSet(setRes.data as AnswerSetsRow) : null,
        answers: (ansRes.data ?? []).map((r) => mapAnswer(r as AnswersRow)),
      };
    },
  });
}

export function useCreateAnswerSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AdminAnswerSet>) => {
      const { data, error } = await supabase
        .from("answer_sets")
        .insert({
          name: input.name ?? "Nová sada",
          description: input.description ?? null,
          branch_slugs: input.categories ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "answer_sets"] }),
  });
}

export function useUpdateAnswerSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AdminAnswerSet> }) => {
      const update: Record<string, unknown> = {};
      if (patch.name !== undefined) update.name = patch.name;
      if (patch.description !== undefined) update.description = patch.description;
      if (patch.categories) update.branch_slugs = patch.categories;
      const { error } = await supabase.from("answer_sets").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "answer_sets"] }),
  });
}

export function useDeleteAnswerSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("answer_sets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "answer_sets"] }),
  });
}

export function useCreateAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      set_id: string;
      text: string;
      is_correct?: boolean;
      explanation?: string;
    }) => {
      const { data, error } = await supabase
        .from("answers")
        .insert({
          set_id: input.set_id,
          text: input.text,
          is_correct: input.is_correct ?? false,
          explanation: input.explanation ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "answer_sets"] }),
  });
}

export function useUpdateAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AdminAnswer> }) => {
      const update: Record<string, unknown> = {};
      if (patch.text !== undefined) update.text = patch.text;
      if (patch.is_correct !== undefined) update.is_correct = patch.is_correct;
      if (patch.explanation !== undefined) update.explanation = patch.explanation;
      const { error } = await supabase.from("answers").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "answer_sets"] }),
  });
}

export function useDeleteAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("answers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "answer_sets"] }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

export function useAdminTests() {
  return useQuery({
    queryKey: ["admin", "tests"],
    queryFn: async (): Promise<AdminTest[]> => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, slug, title, description, status, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapTest(r as TestsRow));
    },
  });
}

export function useAdminTest(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "tests", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const [testRes, tqRes] = await Promise.all([
        supabase
          .from("tests")
          .select("id, slug, title, description, status, updated_at")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("test_questions")
          .select("question_id, position")
          .eq("test_id", id)
          .order("position", { ascending: true }),
      ]);
      if (testRes.error) throw testRes.error;
      if (tqRes.error) throw tqRes.error;
      if (!testRes.data) return null;
      const test = mapTest(testRes.data as TestsRow);
      test.question_ids = (tqRes.data ?? []).map((r) => (r as { question_id: string }).question_id);
      return test;
    },
  });
}

export function useCreateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AdminTest> & { owner_id: string }) => {
      const { data, error } = await supabase
        .from("tests")
        .insert({
          slug: input.slug ?? `test-${Date.now()}`,
          share_id: crypto.randomUUID(),
          owner_id: input.owner_id,
          title: input.title ?? "Nový test",
          description: input.description ?? null,
          status: (input.status ?? "draft") as never,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tests"] }),
  });
}

export function useUpdateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AdminTest> }) => {
      const update: Record<string, unknown> = {};
      if (patch.title !== undefined) update.title = patch.title;
      if (patch.slug !== undefined) update.slug = patch.slug;
      if (patch.description !== undefined) update.description = patch.description;
      if (patch.status) update.status = patch.status;
      const { error } = await supabase.from("tests").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tests"] }),
  });
}

export function useDeleteTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tests"] }),
  });
}

// ---------------------------------------------------------------------------
// Categories + topics
// ---------------------------------------------------------------------------

export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async (): Promise<AdminCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, color")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => mapCategory(r as CategoriesRow));
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AdminCategory>) => {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: input.name ?? "Nová kategória",
          slug: input.slug ?? `cat-${Date.now()}`,
          description: input.description ?? null,
          color: input.color ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AdminCategory> }) => {
      const { error } = await supabase.from("categories").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

export function useAdminTopics() {
  return useQuery({
    queryKey: ["admin", "topics"],
    queryFn: async (): Promise<AdminTopic[]> => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, slug, description, color")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => mapTopic(r as TopicsRow));
    },
  });
}

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AdminTopic>) => {
      const { data, error } = await supabase
        .from("topics")
        .insert({
          name: input.name ?? "Nová téma",
          slug: input.slug ?? `top-${Date.now()}`,
          description: input.description ?? null,
          color: input.color ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "topics"] }),
  });
}

export function useUpdateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AdminTopic> }) => {
      const { error } = await supabase.from("topics").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "topics"] }),
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "topics"] }),
  });
}

// ---------------------------------------------------------------------------
// Trainings
// ---------------------------------------------------------------------------

export function useAdminTrainings() {
  return useQuery({
    queryKey: ["admin", "trainings"],
    queryFn: async (): Promise<AdminTraining[]> => {
      const { data, error } = await supabase
        .from("trainings")
        .select("id, title, description, topic_slug, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapTraining(r as TrainingsRow));
    },
  });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AdminTraining>) => {
      const { data, error } = await supabase
        .from("trainings")
        .insert({
          title: input.title ?? "Nové školenie",
          description: input.description ?? null,
          topic_slug: input.topic ?? null,
          status: (input.status ?? "draft") as never,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "trainings"] }),
  });
}

export function useUpdateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AdminTraining> }) => {
      const update: Record<string, unknown> = {};
      if (patch.title !== undefined) update.title = patch.title;
      if (patch.description !== undefined) update.description = patch.description;
      if (patch.topic !== undefined) update.topic_slug = patch.topic;
      if (patch.status) update.status = patch.status;
      const { error } = await supabase.from("trainings").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "trainings"] }),
  });
}

export function useDeleteTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "trainings"] }),
  });
}

// ---------------------------------------------------------------------------
// Respondents + sessions
// ---------------------------------------------------------------------------

type AdminSessionRow = {
  id: string;
  test_id: string;
  respondent_id: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
};

export function useAdminSessions() {
  return useQuery({
    queryKey: ["admin", "sessions"],
    queryFn: async (): Promise<AdminSessionRow[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, test_id, respondent_id, status, started_at, finished_at")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminSessionRow[];
    },
  });
}

export function useAdminRespondents() {
  return useQuery({
    queryKey: ["admin", "respondents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("respondents")
        .select("id, email, display_name, anonymized_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RespondentsRow[];
    },
  });
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export interface LogAuditEventInput {
  action: string;
  target_type: string;
  target_id: string;
  pii_access?: boolean;
  details?: Record<string, unknown> | string;
}

// AH-11.3 — audit_log is INSERT-locked by RLS + immutability trigger; the
// only sanctioned write path is the SECURITY DEFINER `log_audit_event` RPC
// which verifies the caller is an admin server-side.
export function useLogAuditEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LogAuditEventInput) => {
      const details =
        typeof input.details === "string" ? { note: input.details } : (input.details ?? {});
      const { data, error } = await supabase.rpc("log_audit_event", {
        p_action: input.action,
        p_target_type: input.target_type,
        p_target_id: input.target_id,
        p_pii_access: input.pii_access ?? true,
        p_details: details,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "audit_log"] }),
  });
}

export function useAdminAuditLog(limit = 100) {
  return useQuery({
    queryKey: ["admin", "audit_log", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, actor_id, actor_name, action, target_type, target_id, pii_access, details, at")
        .order("at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AuditLogRow[];
    },
  });
}

// ---------------------------------------------------------------------------
// DSR queue
// ---------------------------------------------------------------------------

export function useAdminDSRQueue() {
  return useQuery({
    queryKey: ["admin", "dsr_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dsr_requests")
        .select("id, requester_email, type, status, note, created_at, sla_due_at, resolved_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DsrRequestsRow[];
    },
  });
}

export function useUpdateDSRStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DsrRequestsRow["status"] }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "completed" || status === "rejected") {
        patch.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("dsr_requests").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "dsr_requests"] }),
  });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export function useAdminReports() {
  return useQuery({
    queryKey: ["admin", "reports"],
    queryFn: async (): Promise<AdminReport[]> => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, target_type, target_id, reason, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapReport(r as ReportsRow));
    },
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReportStatus }) => {
      const { error } = await supabase.from("reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reports"] }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reports"] }),
  });
}

// ---------------------------------------------------------------------------
// Users (profiles + user_roles)
// ---------------------------------------------------------------------------

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, display_name, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const roleMap = new Map<string, string>(
        (rolesRes.data ?? []).map((r) => [(r as UserRolesRow).user_id, (r as UserRolesRow).role]),
      );
      return (profilesRes.data ?? []).map((p) =>
        mapUser(p as ProfilesRow, roleMap.get((p as ProfilesRow).id)),
      );
    },
  });
}

// AH-11.3 Part 2 — privileged mutations on users (role + ban) require the
// service-role key, which only lives inside the Cloudflare Pages function
// at PATCH /api/admin/users/:id. The function verifies the caller is an
// admin and logs every action via the audit_log RPC. These hooks just
// forward the caller's session JWT and surface the error string verbatim.

async function patchAdminUser(
  userId: string,
  patch: { role?: string; banned?: boolean },
): Promise<{ ok: true; user_id: string; role?: string | null; banned?: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("not_authenticated");
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    let message = res.statusText || "user_patch_failed";
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody?.error) message = errBody.error;
    } catch {
      // body wasn't JSON — fall through with statusText
    }
    throw new Error(message);
  }
  return res.json() as Promise<{
    ok: true;
    user_id: string;
    role?: string | null;
    banned?: boolean;
  }>;
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AdminUser["role"] }) => {
      return patchAdminUser(userId, { role });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useToggleUserBanned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      return patchAdminUser(userId, { banned });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ["admin", "dashboard_stats"],
    queryFn: async (): Promise<AdminDashboardStats> => {
      const counts = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "flagged"]),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("trainings").select("id", { count: "exact", head: true }),
        supabase.from("tests").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("id", { count: "exact", head: true }),
        supabase
          .from("dsr_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]),
      ]);
      for (const r of counts) if (r.error) throw r.error;
      const [users, questions, pending, openReports, trainings, tests, sessions, pendingDsr] =
        counts;
      return {
        total_users: users.count ?? 0,
        // TODO: derive when AH-12 schema enrichment lands (last_active_at)
        active_users_7d: 0,
        total_questions: questions.count ?? 0,
        pending_review: pending.count ?? 0,
        total_answers: 0,
        open_reports: openReports.count ?? 0,
        total_trainings: trainings.count ?? 0,
        training_views: 0,
        total_tests: tests.count ?? 0,
        total_sessions: sessions.count ?? 0,
        pending_dsr: pendingDsr.count ?? 0,
      };
    },
  });
}

export function useAdminActivity(limit = 20) {
  return useQuery({
    queryKey: ["admin", "activity", limit],
    queryFn: async (): Promise<AdminActivityEvent[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, actor_name, action, target_type, at")
        .order("at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as {
          id: string;
          actor_name: string | null;
          action: string;
          target_type: string | null;
          at: string;
        };
        // TODO: derive when AH-12 schema enrichment lands (real event types)
        const type: AdminActivityEvent["type"] =
          r.target_type === "test"
            ? "test_published"
            : r.target_type === "report"
              ? "report_filed"
              : r.action === "user_signup"
                ? "user_signup"
                : "question_created";
        return {
          id: r.id,
          type,
          actor: r.actor_name ?? "system",
          summary: `${r.action}${r.target_type ? ` ${r.target_type}` : ""}`,
          created_at: r.at,
        };
      });
    },
  });
}
