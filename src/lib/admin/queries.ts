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

import { useMemo } from "react";
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
  prompt_en?: string | null;
  prompt_cs?: string | null;
  options_en?: unknown;
  options_cs?: unknown;
  visual_en?: unknown;
  visual_cs?: unknown;
};

// AH-15.7: jsonb columns are arbitrary scam-scenario payloads. The
// editor surfaces them as JSON text so admins can paste translated
// options/visual structures without us inventing a schema-specific
// form. `undefined` -> column unchanged on save; "" -> NULL.
const jsonbToString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return undefined;
  }
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
    body_en: row.prompt_en ?? undefined,
    body_cs: row.prompt_cs ?? undefined,
    options_en: jsonbToString(row.options_en),
    options_cs: jsonbToString(row.options_cs),
    visual_en: jsonbToString(row.visual_en),
    visual_cs: jsonbToString(row.visual_cs),
  };
};

// Parses an editor-supplied JSON string for a jsonb column.
// "" -> null (clear column), undefined -> undefined (don't touch),
// invalid JSON throws so the mutation surfaces the error.
const parseJsonbForUpdate = (value: string | undefined): unknown => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return JSON.parse(trimmed);
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
        .select(
          "id, prompt, branch_slug, author_id, status, answer_set_id, created_at, prompt_en, prompt_cs, options_en, options_cs, visual_en, visual_cs",
        )
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
        .select(
          "id, prompt, branch_slug, author_id, status, answer_set_id, created_at, prompt_en, prompt_cs, options_en, options_cs, visual_en, visual_cs",
        )
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
      // AH-15.7: per-locale columns. "" -> null (clear translation),
      // undefined -> leave column alone.
      if (patch.body_en !== undefined) update.prompt_en = patch.body_en.trim() || null;
      if (patch.body_cs !== undefined) update.prompt_cs = patch.body_cs.trim() || null;
      if (patch.options_en !== undefined) update.options_en = parseJsonbForUpdate(patch.options_en);
      if (patch.options_cs !== undefined) update.options_cs = parseJsonbForUpdate(patch.options_cs);
      if (patch.visual_en !== undefined) update.visual_en = parseJsonbForUpdate(patch.visual_en);
      if (patch.visual_cs !== undefined) update.visual_cs = parseJsonbForUpdate(patch.visual_cs);
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

/**
 * Bulk-resolve `profiles.email -> profiles.id` for a list of e-mails.
 *
 * Used by the DSR queue to render an *Open dossier* icon on rows whose
 * requester e-mail matches a real `auth.users` account. E-mails are
 * compared case-insensitively (profiles stores lowercased e-mails;
 * DSR requester_email is whatever the form submitted — we lowercase
 * both sides before matching). Returns a `Record<lowercased_email, user_id>`.
 *
 * Empty input → empty map, no query fires (saves a roundtrip on the
 * first render before DSR data lands).
 */
export function useUsersByEmails(emails: string[]) {
  // De-dupe + lowercase for a stable cache key and a single `.in(...)` query.
  const normalised = useMemo(() => {
    const set = new Set<string>();
    for (const e of emails) {
      if (e) set.add(e.trim().toLowerCase());
    }
    return Array.from(set).sort();
  }, [emails]);
  return useQuery({
    queryKey: ["admin", "users_by_emails", normalised],
    enabled: normalised.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email")
        .in("email", normalised);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as Array<{ id: string; email: string | null }>) {
        if (row.email) map[row.email.toLowerCase()] = row.id;
      }
      return map;
    },
  });
}

/**
 * Per-user GDPR activity summary, keyed by lowercased e-mail.
 *
 * For each e-mail in the input, returns the newest GDPR-relevant event we
 * can attribute via e-mail join (DSR `requester_email` + DPA `contact_email`)
 * plus a flag for "currently has at least one open / in-progress DSR".
 * Used by /admin/users to show a *Posledná GDPR udalosť* column and a
 * *Iba s otvorenou DSR* filter without N+1 queries.
 *
 * Two parallel SELECTs (one per table) keyed on lowercased e-mail; the
 * results are reduced into `Record<email, GdprActivity>`. E-mails with
 * zero events get a `{ last_event_at: null, last_event_kind: null,
 * has_open_dsr: false }` entry so callers can do a single lookup without
 * a fallback branch.
 *
 * Empty input → no queries fire.
 */
export type GdprEventKind = "dsr" | "dpa";

export interface GdprActivity {
  last_event_at: string | null;
  last_event_kind: GdprEventKind | null;
  has_open_dsr: boolean;
}

export function useUsersGdprActivity(emails: string[]) {
  const normalised = useMemo(() => {
    const set = new Set<string>();
    for (const e of emails) {
      if (e) set.add(e.trim().toLowerCase());
    }
    return Array.from(set).sort();
  }, [emails]);
  return useQuery({
    queryKey: ["admin", "users_gdpr_activity", normalised],
    enabled: normalised.length > 0,
    queryFn: async (): Promise<Record<string, GdprActivity>> => {
      const [dsrRes, dpaRes] = await Promise.all([
        supabase
          .from("dsr_requests")
          .select("requester_email, status, created_at")
          .in("requester_email", normalised),
        supabase
          .from("dpa_requests")
          .select("contact_email, created_at")
          .in("contact_email", normalised),
      ]);
      if (dsrRes.error) throw dsrRes.error;
      if (dpaRes.error) throw dpaRes.error;
      // Seed every requested e-mail so the caller can do a plain lookup.
      const map: Record<string, GdprActivity> = {};
      for (const e of normalised) {
        map[e] = { last_event_at: null, last_event_kind: null, has_open_dsr: false };
      }
      for (const row of (dsrRes.data ?? []) as Array<{
        requester_email: string;
        status: string;
        created_at: string;
      }>) {
        const key = row.requester_email.toLowerCase();
        const entry = map[key];
        if (!entry) continue;
        if (!entry.last_event_at || row.created_at > entry.last_event_at) {
          entry.last_event_at = row.created_at;
          entry.last_event_kind = "dsr";
        }
        if (row.status === "open" || row.status === "in_progress") {
          entry.has_open_dsr = true;
        }
      }
      for (const row of (dpaRes.data ?? []) as Array<{
        contact_email: string | null;
        created_at: string;
      }>) {
        if (!row.contact_email) continue;
        const key = row.contact_email.toLowerCase();
        const entry = map[key];
        if (!entry) continue;
        if (!entry.last_event_at || row.created_at > entry.last_event_at) {
          entry.last_event_at = row.created_at;
          entry.last_event_kind = "dpa";
        }
      }
      return map;
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
        // E40 close-out — surface DPA backlog alongside DSR. "Pending"
        // is the school's perspective: school submitted the form, we
        // haven't reached signed/cancelled yet (delivered is still
        // open from the operator's POV — they may still need to
        // re-send / chase a signature).
        supabase
          .from("dpa_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "delivered"]),
      ]);
      for (const r of counts) if (r.error) throw r.error;
      const [
        users,
        questions,
        pending,
        openReports,
        trainings,
        tests,
        sessions,
        pendingDsr,
        pendingDpa,
      ] = counts;
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
        pending_dpa: pendingDpa.count ?? 0,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// CMS — pages, header, footer, navigation, share-card, quick-test config.
// ---------------------------------------------------------------------------
// AH-11.5a swaps the admin CMS routes and the public /s/$slug loader from
// `cms-mock-store` onto these hooks. The UI types live in `cms-types`
// (AH-11.6 relocation) so production code never reaches into the mock
// module. The mappers below adapt the DB rows (jsonb columns, snake_case)
// into those shapes so the route components render unchanged. Mutations
// write through optimistic cache updates so the UI reacts SYNC and tests
// can assert the effect right after `fireEvent.click`. RLS allows anon
// SELECT on the public rows (cms_pages where status='published', all
// singletons).

import type {
  CmsBlock,
  CmsFooter,
  CmsHeader,
  CmsNavItem,
  CmsPage,
  CmsShareCard,
  PageStatus,
  QuickTestConfig,
} from "./cms-types";

interface CmsPagesRow {
  id: string;
  slug: string;
  title: string;
  seo_description: string | null;
  blocks: CmsBlock[] | null;
  status: string;
  published_at: string | null;
  updated_at: string;
}

const mapCmsPage = (row: CmsPagesRow): CmsPage => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  seo_description: row.seo_description ?? "",
  content_blocks: Array.isArray(row.blocks) ? row.blocks : [],
  status: (row.status as PageStatus) ?? "draft",
  published_at: row.published_at,
  updated_at: row.updated_at,
});

const cmsPagePatchToRow = (patch: Partial<CmsPage>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.seo_description !== undefined) row.seo_description = patch.seo_description;
  if (patch.content_blocks !== undefined) row.blocks = patch.content_blocks;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.published_at !== undefined) row.published_at = patch.published_at;
  return row;
};

export function useCmsPages() {
  return useQuery({
    queryKey: ["admin", "cms", "pages"],
    queryFn: async (): Promise<CmsPage[]> => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("id, slug, title, seo_description, blocks, status, published_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapCmsPage(r as CmsPagesRow));
    },
  });
}

// Public read for /s/$slug. Anon SELECT is allowed by RLS when
// status = 'published' AND published_at IS NOT NULL.
export function usePublishedCmsPage(slug: string | undefined) {
  return useQuery({
    queryKey: ["cms", "pages", "published", slug],
    enabled: !!slug,
    queryFn: async (): Promise<CmsPage | null> => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("cms_pages")
        .select("id, slug, title, seo_description, blocks, status, published_at, updated_at")
        .eq("slug", slug)
        .eq("status", "published")
        .not("published_at", "is", null)
        .maybeSingle();
      if (error) throw error;
      return data ? mapCmsPage(data as CmsPagesRow) : null;
    },
  });
}

export function useCreateCmsPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input?: Partial<CmsPage>): Promise<CmsPage> => {
      const draft = {
        slug: input?.slug ?? `nova-stranka-${Date.now().toString(36).slice(-4)}`,
        title: input?.title ?? "Nová stránka",
        seo_description: input?.seo_description ?? "",
        blocks: input?.content_blocks ?? [],
        status: "draft",
      };
      const { data, error } = await supabase.from("cms_pages").insert(draft).select().single();
      if (error) throw error;
      return mapCmsPage(data as CmsPagesRow);
    },
    onSuccess: (page) => {
      qc.setQueryData<CmsPage[]>(["admin", "cms", "pages"], (prev) => [page, ...(prev ?? [])]);
      qc.invalidateQueries({ queryKey: ["admin", "cms", "pages"] });
    },
  });
}

export function useUpdateCmsPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CmsPage> }) => {
      const row = cmsPagePatchToRow(patch);
      const { error } = await supabase.from("cms_pages").update(row).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, patch }) => {
      qc.setQueryData<CmsPage[]>(["admin", "cms", "pages"], (prev) =>
        (prev ?? []).map((p) =>
          p.id === id ? { ...p, ...patch, updated_at: new Date().toISOString() } : p,
        ),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "cms", "pages"] }),
  });
}

export function useDeleteCmsPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) => {
      qc.setQueryData<CmsPage[]>(["admin", "cms", "pages"], (prev) =>
        (prev ?? []).filter((p) => p.id !== id),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "cms", "pages"] }),
  });
}

// Combined publish/unpublish — `publish: true` sets status+published_at,
// `false` clears both. Matches the AH-9 mock helpers.
export function usePublishCmsPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const patch = publish
        ? { status: "published", published_at: new Date().toISOString() }
        : { status: "draft", published_at: null };
      const { error } = await supabase.from("cms_pages").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, publish }) => {
      const patch: Partial<CmsPage> = publish
        ? { status: "published", published_at: new Date().toISOString() }
        : { status: "draft", published_at: null };
      qc.setQueryData<CmsPage[]>(["admin", "cms", "pages"], (prev) =>
        (prev ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "cms", "pages"] }),
  });
}

// ---- Singleton configs (header / footer / navigation / share-card / quick-test)
// All five singletons sit on PK id=1; the seed row is created by the
// migration. Each hook returns a sensible default while loading so the
// route UIs (which read fields directly) never see `undefined`.

interface CmsHeaderRow {
  logo: string | null;
  nav: { cta_label?: string; cta_url?: string; mobile_trigger_label?: string } | null;
}

const DEFAULT_HEADER: CmsHeader = {
  logo_url: "",
  cta_label: "",
  cta_url: "",
  mobile_trigger_label: "",
};

const mapCmsHeader = (row: CmsHeaderRow | null): CmsHeader => {
  if (!row) return DEFAULT_HEADER;
  const nav = row.nav ?? {};
  return {
    logo_url: row.logo ?? "",
    cta_label: nav.cta_label ?? "",
    cta_url: nav.cta_url ?? "",
    mobile_trigger_label: nav.mobile_trigger_label ?? "",
  };
};

export function useCmsHeader() {
  return useQuery({
    queryKey: ["admin", "cms", "header"],
    queryFn: async (): Promise<CmsHeader> => {
      const { data, error } = await supabase
        .from("cms_header")
        .select("logo, nav")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return mapCmsHeader(data as CmsHeaderRow | null);
    },
    initialData: DEFAULT_HEADER,
    // Without this, TanStack Query v5 treats `initialData` as fresh
    // and the staleTime=30s default suppresses the queryFn fetch for
    // 30s after mount — admin would see DEFAULT_HEADER placeholder
    // instead of the real DB row (2026-05-19 finding from
    // admin/navigation E2E generator agent).
    initialDataUpdatedAt: 0,
  });
}

export function useUpdateCmsHeader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CmsHeader>) => {
      const current = qc.getQueryData<CmsHeader>(["admin", "cms", "header"]) ?? DEFAULT_HEADER;
      const next = { ...current, ...patch };
      const { error } = await supabase
        .from("cms_header")
        .update({
          logo: next.logo_url,
          nav: {
            cta_label: next.cta_label,
            cta_url: next.cta_url,
            mobile_trigger_label: next.mobile_trigger_label,
          },
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onMutate: (patch) => {
      qc.setQueryData<CmsHeader>(
        ["admin", "cms", "header"],
        (prev) => ({ ...(prev ?? DEFAULT_HEADER), ...patch }) as CmsHeader,
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "cms", "header"] }),
  });
}

interface CmsFooterRow {
  columns: CmsFooter["columns"] | null;
  socials: CmsFooter["socials"] | null;
}

const DEFAULT_FOOTER: CmsFooter = { columns: [], socials: [] };

const mapCmsFooter = (row: CmsFooterRow | null): CmsFooter => ({
  columns: Array.isArray(row?.columns) ? row!.columns : [],
  socials: Array.isArray(row?.socials) ? row!.socials : [],
});

export function useCmsFooter() {
  return useQuery({
    queryKey: ["admin", "cms", "footer"],
    queryFn: async (): Promise<CmsFooter> => {
      const { data, error } = await supabase
        .from("cms_footer")
        .select("columns, socials")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return mapCmsFooter(data as CmsFooterRow | null);
    },
    initialData: DEFAULT_FOOTER,
    // See `useCmsHeader` comment — same staleTime+initialData trap.
    initialDataUpdatedAt: 0,
  });
}

export function useUpdateCmsFooter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (next: CmsFooter) => {
      const { error } = await supabase
        .from("cms_footer")
        .update({ columns: next.columns, socials: next.socials })
        .eq("id", 1);
      if (error) throw error;
    },
    onMutate: (next) => {
      qc.setQueryData<CmsFooter>(["admin", "cms", "footer"], next);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "cms", "footer"] }),
  });
}

interface CmsNavigationRow {
  items: CmsNavItem[] | null;
}

const mapCmsNavigation = (row: CmsNavigationRow | null): CmsNavItem[] =>
  Array.isArray(row?.items) ? row!.items : [];

export function useCmsNavigation() {
  return useQuery({
    queryKey: ["admin", "cms", "navigation"],
    queryFn: async (): Promise<CmsNavItem[]> => {
      const { data, error } = await supabase
        .from("cms_navigation")
        .select("items")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return mapCmsNavigation(data as CmsNavigationRow | null);
    },
    initialData: [] as CmsNavItem[],
    initialDataUpdatedAt: 0,
  });
}

export function useUpdateCmsNavigation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: CmsNavItem[]) => {
      const { error } = await supabase.from("cms_navigation").update({ items }).eq("id", 1);
      if (error) throw error;
    },
    onMutate: (items) => {
      qc.setQueryData<CmsNavItem[]>(["admin", "cms", "navigation"], items);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "cms", "navigation"] }),
  });
}

interface ShareCardRow {
  branding: {
    og_template_url?: string;
    title_fallback?: string;
    description_fallback?: string;
  } | null;
}

const DEFAULT_SHARE_CARD: CmsShareCard = {
  og_template_url: "",
  title_fallback: "",
  description_fallback: "",
};

const mapShareCard = (row: ShareCardRow | null): CmsShareCard => {
  const b = row?.branding ?? {};
  return {
    og_template_url: b.og_template_url ?? "",
    title_fallback: b.title_fallback ?? "",
    description_fallback: b.description_fallback ?? "",
  };
};

export function useCmsShareCard() {
  return useQuery({
    queryKey: ["admin", "cms", "share_card"],
    queryFn: async (): Promise<CmsShareCard> => {
      const { data, error } = await supabase
        .from("share_card_config")
        .select("branding")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return mapShareCard(data as ShareCardRow | null);
    },
    initialData: DEFAULT_SHARE_CARD,
    // See `useCmsHeader` comment — same staleTime+initialData trap.
    initialDataUpdatedAt: 0,
  });
}

export function useUpdateCmsShareCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CmsShareCard>) => {
      const current =
        qc.getQueryData<CmsShareCard>(["admin", "cms", "share_card"]) ?? DEFAULT_SHARE_CARD;
      const next = { ...current, ...patch };
      const { error } = await supabase
        .from("share_card_config")
        .update({
          branding: {
            og_template_url: next.og_template_url,
            title_fallback: next.title_fallback,
            description_fallback: next.description_fallback,
          },
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onMutate: (patch) => {
      qc.setQueryData<CmsShareCard>(
        ["admin", "cms", "share_card"],
        (prev) => ({ ...(prev ?? DEFAULT_SHARE_CARD), ...patch }) as CmsShareCard,
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "cms", "share_card"] }),
  });
}

interface QuickTestRow {
  config: Partial<QuickTestConfig> | null;
}

const DEFAULT_QUICK_TEST: QuickTestConfig = {
  id: "qt_default",
  visible: true,
  title: "",
  description: "",
  branza: "Všeobecný test",
  time_seconds: 120,
  pass_percentage: 60,
  difficulty: "Ľahká",
  question_ids: [],
};

const mapQuickTest = (row: QuickTestRow | null): QuickTestConfig => ({
  ...DEFAULT_QUICK_TEST,
  ...(row?.config ?? {}),
});

export function useCmsQuickTestConfig() {
  return useQuery({
    queryKey: ["admin", "cms", "quick_test"],
    queryFn: async (): Promise<QuickTestConfig> => {
      const { data, error } = await supabase
        .from("quick_test_config")
        .select("config")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return mapQuickTest(data as QuickTestRow | null);
    },
    initialData: DEFAULT_QUICK_TEST,
    // See `useCmsHeader` comment — same staleTime+initialData trap.
    initialDataUpdatedAt: 0,
  });
}

export function useUpdateCmsQuickTestConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<QuickTestConfig>) => {
      const current =
        qc.getQueryData<QuickTestConfig>(["admin", "cms", "quick_test"]) ?? DEFAULT_QUICK_TEST;
      const next = { ...current, ...patch };
      const { error } = await supabase
        .from("quick_test_config")
        .update({ config: next })
        .eq("id", 1);
      if (error) throw error;
    },
    onMutate: (patch) => {
      qc.setQueryData<QuickTestConfig>(
        ["admin", "cms", "quick_test"],
        (prev) => ({ ...(prev ?? DEFAULT_QUICK_TEST), ...patch }) as QuickTestConfig,
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "cms", "quick_test"] }),
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

// ---------------------------------------------------------------------------
// DPA requests queue (E40.5)
// ---------------------------------------------------------------------------

export type DpaRequestStatus = "pending" | "delivered" | "signed" | "cancelled";
export type DpaEmailStatus = "pending" | "sent" | "failed";

export interface AdminDpaRequest {
  id: string;
  created_at: string;
  contact_name: string | null;
  contact_email: string | null;
  school_name: string;
  dpa_version: string;
  status: DpaRequestStatus;
  email_status: DpaEmailStatus;
  email_error: string | null;
  anonymized_at: string | null;
}

export function useAdminDpaRequests() {
  return useQuery({
    queryKey: ["admin", "dpa_requests"],
    queryFn: async (): Promise<AdminDpaRequest[]> => {
      const { data, error } = await supabase
        .from("dpa_requests")
        .select(
          "id, created_at, contact_name, contact_email, school_name, dpa_version, status, email_status, email_error, anonymized_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminDpaRequest[];
    },
  });
}

export function useUpdateDpaRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DpaRequestStatus }) => {
      const { error } = await supabase.from("dpa_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "dpa_requests"] }),
  });
}

export function useAnonymiseDpaRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("dpa_requests")
        .update({
          contact_name: null,
          contact_email: null,
          anonymized_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "dpa_requests"] }),
  });
}

/**
 * Admin: re-render the row's PDF in the browser and trigger a download.
 *
 * Same generator as the public form + the admin re-send (`useResendDpaEmail`),
 * with `generatedAt` pinned to the row's `created_at` so the file matches
 * what the school received on submission day. Lets counsel / operators
 * verify ARt. 28(9) traceability without bothering the school.
 *
 * No network roundtrip — the PDF is built client-side and the function
 * appends a hidden `<a download>` to fire the save dialog. Errors bubble
 * to the caller so toast handling stays in the component.
 */
export function useDownloadDpaPdf() {
  return useMutation({
    mutationFn: async ({ row }: { row: AdminDpaRequest }) => {
      if (!row.contact_name || !row.contact_email) {
        throw new Error("anonymised");
      }
      const { renderDpaPdfBlob } = await import("@/lib/dpa/render.client");
      const blob = await renderDpaPdfBlob({
        schoolName: row.school_name,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        requestId: row.id,
        version: row.dpa_version,
        generatedAt: new Date(row.created_at),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DPA-subenai-${row.school_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)}-${row.dpa_version}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Release the object URL on next tick — Safari occasionally races
      // the download save dialog if revoked synchronously.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
  });
}

export function useResendDpaEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ row }: { row: AdminDpaRequest }) => {
      if (!row.contact_name || !row.contact_email) {
        throw new Error("anonymised");
      }
      const { renderDpaPdfBlob } = await import("@/lib/dpa/render.client");
      // Re-send must stamp the ORIGINAL generated date — not now() — so the
      // re-delivered PDF matches the row's created_at for Art. 28(9) GDPR
      // traceability ("which version did school X agree on, when").
      const blob = await renderDpaPdfBlob({
        schoolName: row.school_name,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        requestId: row.id,
        version: row.dpa_version,
        generatedAt: new Date(row.created_at),
      });
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const r = String(reader.result ?? "");
          const idx = r.indexOf(",");
          resolve(idx >= 0 ? r.slice(idx + 1) : r);
        };
        reader.onerror = () => reject(new Error("read_blob_failed"));
        reader.readAsDataURL(blob);
      });
      // Reset email_status to 'pending' so the handler's 409 already_sent
      // guard does not refuse a legitimate admin-triggered re-send.
      //
      // KNOWN RACE (v1 acceptable): two admins clicking re-send within the
      // same second both find email_status='pending' and both POST. The
      // handler's Resend `Idempotency-Key: dpa-{requestId}` header is the
      // mitigation — Resend dedupes server-side and returns the same
      // message ID for both calls, so the school receives ONE e-mail.
      // Tighter atomic guard (UPDATE … RETURNING in the handler) deferred
      // to v1.1 if the admin team grows beyond a single operator.
      await supabase.from("dpa_requests").update({ email_status: "pending" }).eq("id", row.id);
      const response = await fetch("/api/dpa-email-attach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: row.id,
          fileName: `DPA-subenai-${row.school_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60)}-${row.dpa_version}.pdf`,
          pdfBase64,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "send_failed");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "dpa_requests"] }),
  });
}

// ---------------------------------------------------------------------------
// E46 — Admin user-data dossier (/admin/users/<user_id>)
// ---------------------------------------------------------------------------

export interface UserDossier {
  profile: {
    id: string;
    email: string | null;
    display_name: string | null;
    avatar_initials: string | null;
    created_at: string;
  } | null;
  profile_preferences: Record<string, unknown> | null;
  user_roles: Array<{ user_id: string; role: string; assigned_by: string | null }>;
  dsr_requests: Array<Record<string, unknown>>;
  dpa_requests: Array<Record<string, unknown>>;
  pending_erasure: {
    user_id: string;
    strategy: string;
    execute_at: string;
    initiated_by: string;
    created_at: string;
  } | null;
  generated_at: string;
  subject: { user_id: string; email: string | null };
}

interface AdminDossierResponse {
  generated_at: string;
  subject: { user_id: string; email: string | null };
  records: {
    profile: UserDossier["profile"];
    profile_preferences: UserDossier["profile_preferences"];
    user_roles: UserDossier["user_roles"];
    dsr_requests: UserDossier["dsr_requests"];
    dpa_requests: UserDossier["dpa_requests"];
    pending_erasure: UserDossier["pending_erasure"];
  };
}

/**
 * Fetches the full GDPR-relevant snapshot of a user via the
 * `export_user_data_admin` RPC (E46.1). Mirrors the JSON the RPC
 * builds — the same payload is also archived as the pre-delete
 * snapshot inside `pending_erasures.pre_delete_snapshot`, so the
 * dossier UI and the recovery surface stay in sync by construction.
 */
export function useUserDossier(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "user_dossier", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<UserDossier> => {
      const { data, error } = await supabase.rpc("export_user_data_admin", {
        p_user_id: userId!,
      });
      if (error) throw error;
      const payload = data as unknown as AdminDossierResponse;
      return {
        ...payload.records,
        generated_at: payload.generated_at,
        subject: payload.subject,
      };
    },
  });
}

/**
 * Anonymize the user's PII in-place (D-1: NULL identity columns, keep
 * statistical rows). Synchronous — returns rows_affected JSON.
 */
export function useAnonymizeUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data, error } = await supabase.rpc("erase_user_data", {
        p_user_id: userId,
        p_strategy: "anonymize",
      });
      if (error) throw error;
      return data as unknown as {
        strategy: "anonymize";
        executed_at: string;
        rows_affected: Record<string, number>;
      };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "user_dossier", vars.userId] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

/**
 * Enqueue a hard-delete with the 5-minute grace window (D-3). Returns
 * `execute_at` so the UI can show a countdown. The actual auth.users
 * deletion happens via the E46.5 cron + Supabase Admin API; until then
 * the row sits in `pending_erasures` and the admin can cancel via
 * `useCancelPendingErasure`.
 */
export function useEnqueueHardDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data, error } = await supabase.rpc("erase_user_data", {
        p_user_id: userId,
        p_strategy: "hard_delete",
      });
      if (error) throw error;
      return data as unknown as {
        strategy: "hard_delete";
        enqueued_at: string;
        execute_at: string;
        grace_window_minutes: number;
      };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "user_dossier", vars.userId] });
    },
  });
}

/**
 * E46.6 — GDPR Art. 16 rectification. The RPC is whitelisted at the
 * DB layer: today only `profiles.display_name` works; any other
 * (table, column) pair raises. The mutation hook intentionally
 * accepts arbitrary strings for `table` + `column` so the UI driver
 * stays generic — the DB is the source of truth on what's editable.
 */
export interface RectifyUserDataInput {
  userId: string;
  table: string;
  column: string;
  newValue: string;
}

export interface RectifyUserDataResult {
  table: string;
  column: string;
  old_value: string | null;
  new_value: string;
  applied_at: string;
}

export function useRectifyUserData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      table,
      column,
      newValue,
    }: RectifyUserDataInput): Promise<RectifyUserDataResult> => {
      const { data, error } = await supabase.rpc("rectify_user_data", {
        p_user_id: userId,
        p_table: table,
        p_column: column,
        p_new_value: newValue,
      });
      if (error) throw error;
      return data as unknown as RectifyUserDataResult;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "user_dossier", vars.userId] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useCancelPendingErasure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data, error } = await supabase.rpc("cancel_pending_erasure", {
        p_user_id: userId,
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "user_dossier", vars.userId] });
    },
  });
}

// E48.6 — Admin support tickets queries.
//
// E48-v2 PR-X (2026-05): the ticket hooks + escape helpers were
// extracted to `./queries-tickets.ts`. This block keeps re-exports as a
// deprecation shim so existing call-sites continue to compile against
// the old import path for one release cycle. New code MUST import from
// `@/lib/admin/queries-tickets` directly.

// @deprecated — moved to queries-tickets.ts. Import from there instead.
export {
  ilikePatternEscape,
  postgrestOrEscape,
  useAdminSupportTickets,
  useAdminSupportTicketAttachmentCounts,
  useAdminSupportTicket,
  useAdminSupportTicketMessages,
  useAdminSupportTicketAttachments,
  useTransitionTicketStatus,
} from "./queries-tickets";

// @deprecated — moved to queries-tickets.ts.
export type {
  SupportTicketsFilters,
  AdminSupportTicketRow,
  AdminSupportTicketMessage,
  AdminSupportTicketAttachment,
} from "./queries-tickets";

// E48.9 — admin notification preferences (per-user row in
// admin_notification_preferences). RLS limits SELECT/UPDATE to the
// owner only (auth.uid() = user_id) — admins cannot see or edit
// another admin's prefs.

export type SupportCategoryKey =
  | "bug"
  | "question"
  | "feature_request"
  | "abuse_report"
  | "billing"
  | "gdpr"
  | "other";

export type DigestCadence = "instant" | "hourly" | "daily" | "off";

export interface AdminNotificationPreferences {
  enabled: boolean;
  channels: { email: boolean; in_app: boolean };
  per_category: Record<SupportCategoryKey, boolean>;
  digest_cadence: DigestCadence;
}

const NOTIFICATION_PREFERENCES_DEFAULTS: AdminNotificationPreferences = {
  enabled: true,
  channels: { email: true, in_app: true },
  per_category: {
    bug: true,
    question: true,
    feature_request: true,
    abuse_report: true,
    billing: true,
    gdpr: true,
    other: true,
  },
  digest_cadence: "instant",
};

export function getDefaultAdminNotificationPreferences(): AdminNotificationPreferences {
  return {
    ...NOTIFICATION_PREFERENCES_DEFAULTS,
    channels: { ...NOTIFICATION_PREFERENCES_DEFAULTS.channels },
    per_category: { ...NOTIFICATION_PREFERENCES_DEFAULTS.per_category },
  };
}

export function useAdminNotificationPreferences() {
  return useQuery({
    queryKey: ["admin", "notification_preferences"],
    queryFn: async (): Promise<AdminNotificationPreferences> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("not_authenticated");

      const { data, error } = await supabase
        .from("admin_notification_preferences")
        .select("enabled, channels, per_category, digest_cadence")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return getDefaultAdminNotificationPreferences();

      const channelsRaw = (data.channels ?? {}) as Record<string, unknown>;
      const perCategoryRaw = (data.per_category ?? {}) as Record<string, unknown>;
      const defaults = getDefaultAdminNotificationPreferences();
      return {
        enabled: data.enabled,
        channels: {
          email: Boolean(channelsRaw.email ?? defaults.channels.email),
          in_app: Boolean(channelsRaw.in_app ?? defaults.channels.in_app),
        },
        per_category: {
          bug: Boolean(perCategoryRaw.bug ?? defaults.per_category.bug),
          question: Boolean(perCategoryRaw.question ?? defaults.per_category.question),
          feature_request: Boolean(
            perCategoryRaw.feature_request ?? defaults.per_category.feature_request,
          ),
          abuse_report: Boolean(perCategoryRaw.abuse_report ?? defaults.per_category.abuse_report),
          billing: Boolean(perCategoryRaw.billing ?? defaults.per_category.billing),
          gdpr: Boolean(perCategoryRaw.gdpr ?? defaults.per_category.gdpr),
          other: Boolean(perCategoryRaw.other ?? defaults.per_category.other),
        },
        digest_cadence: (data.digest_cadence as DigestCadence) ?? defaults.digest_cadence,
      };
    },
  });
}

export function useUpdateAdminNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: AdminNotificationPreferences) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("not_authenticated");

      const { error } = await supabase.from("admin_notification_preferences").upsert(
        {
          user_id: userId,
          enabled: prefs.enabled,
          channels: prefs.channels,
          per_category: prefs.per_category,
          digest_cadence: prefs.digest_cadence,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      return prefs;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "notification_preferences"] });
    },
  });
}

// ---------------------------------------------------------------------------
// E44 Phase C — template moderation queue
// ---------------------------------------------------------------------------

export type TemplateSubmissionStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type TemplateAgeRating = "all" | "thirteen_plus" | "sixteen_plus" | "eighteen_plus";

export interface AdminTemplateSubmissionRow {
  id: string;
  template_id: string;
  author_id: string;
  author_display_name: string;
  age_rating_declared: TemplateAgeRating;
  license: "cc-by-4.0";
  status: TemplateSubmissionStatus;
  precheck: Record<string, unknown> | null;
  precheck_passed: boolean | null;
  precheck_at: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  submitted_at: string;
  updated_at: string;
  template: {
    title: string;
    description: string | null;
    question_ids: string[];
  } | null;
}

// Pending queue for `/admin/templates`. Joins the template title so the
// reviewer doesn't have to chase a second query per row. RLS lets admin
// read every submission row regardless of author.
export function useAdminPendingTemplateSubmissions() {
  return useQuery({
    queryKey: ["admin", "template_submissions", "pending"],
    queryFn: async (): Promise<AdminTemplateSubmissionRow[]> => {
      const { data, error } = await supabase
        .from("template_submissions")
        .select(
          `id, template_id, author_id, author_display_name, age_rating_declared,
           license, status, precheck, precheck_passed, precheck_at,
           rejection_reason, reviewed_at, reviewer_id, submitted_at, updated_at,
           template:templates!template_submissions_template_id_fkey
             (title, description, question_ids)`,
        )
        .eq("status", "pending")
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AdminTemplateSubmissionRow[];
    },
  });
}

// Shell badge count: unread admin-kind notifications for the current
// admin user. Generalises beyond template submissions — any future
// admin-kind notification (DSR escalation, sponsor alert) shows up here.
export function useUnreadAdminNotificationsCount() {
  return useQuery({
    queryKey: ["admin", "notifications", "admin_unread_count"],
    queryFn: async (): Promise<number> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return 0;
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("kind", "admin")
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    // Poll every 60s so a freshly-submitted template lights up the badge
    // even if the admin is sitting on a route that doesn't otherwise
    // invalidate this query.
    refetchInterval: 60_000,
  });
}

export function useApproveTemplateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId }: { submissionId: string }) => {
      const { data, error } = await supabase.rpc("approve_template_submission", {
        p_submission_id: submissionId,
      });
      if (error) throw error;
      return data as string; // template_id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "template_submissions"] });
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
  });
}

export function useRejectTemplateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: string }) => {
      const { error } = await supabase.rpc("reject_template_submission", {
        p_submission_id: submissionId,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "template_submissions"] });
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
  });
}
