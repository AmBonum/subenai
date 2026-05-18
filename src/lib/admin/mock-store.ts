// AH-11.6 carve-out — admin in-memory repo, retained for tests and the
// `answer-sets-mock-store` user-side viewer at /app/sets/$setId.
// Production admin reads go through `@/lib/admin/queries.ts` + Supabase.
// AH-14 migrates the answer-sets viewer onto `useAnswerSets` /
// `useAnswers` query hooks; at that point this file plus
// `answer-sets-mock-store` and `mock-data` can be deleted together.
//
// Reactive in-memory store + repo abstraction for the SubenAI admin.
//
// The whole module is intentionally synchronous and framework-free so any
// page can read it via `useAdminState(selector)` and mutate it via
// `adminRepo.<entity>.<op>(...)`. Every mutator returns the canonical record
// (or void for deletes) so callers don't need to read-after-write.
//
// SWAPPING TO SUPABASE
// --------------------
// Each repo method is one-to-one with a Supabase query. Replace the body and
// keep the signature stable; React components don't need to change. Example:
//
//   list: async () => {
//     const { data, error } = await supabase
//       .from("questions").select("*").order("created_at", { ascending: false });
//     if (error) throw error;
//     return data;
//   }
//
// For mutations wrap each `state.x = ...; emit();` block in a Supabase call
// followed by `await refetch()`. Consider wiring the same shape through
// TanStack Query (`queryOptions({ queryKey, queryFn: repo.x.list })`) and
// invalidating after mutations.

import { useSyncExternalStore } from "react";

import {
  mockQuestions,
  mockUsers,
  mockTests,
  mockTrainings,
  mockAnswerSets,
  mockAnswers,
  mockReports,
  mockCategories,
  mockTopics,
  mockQuickTest,
  defaultShareCard,
  type AdminQuestion,
  type AdminUser,
  type AdminTest,
  type AdminTraining,
  type AdminAnswerSet,
  type AdminAnswer,
  type AdminReport,
  type AdminCategory,
  type AdminTopic,
  type ShareCardConfig,
} from "@/lib/admin/mock-data";

interface AdminState {
  questions: AdminQuestion[];
  users: AdminUser[];
  tests: AdminTest[];
  trainings: AdminTraining[];
  answerSets: AdminAnswerSet[];
  answers: AdminAnswer[];
  reports: AdminReport[];
  categories: AdminCategory[];
  topics: AdminTopic[];
  quickTest: AdminTest;
  shareCard: ShareCardConfig;
}

const state: AdminState = {
  questions: [...mockQuestions],
  users: [...mockUsers],
  tests: [...mockTests],
  trainings: [...mockTrainings],
  answerSets: [...mockAnswerSets],
  answers: [...mockAnswers],
  reports: [...mockReports],
  categories: [...mockCategories],
  topics: [...mockTopics],
  quickTest: { ...mockQuickTest },
  shareCard: { ...defaultShareCard, tiers: defaultShareCard.tiers.map((t) => ({ ...t })) },
};

const subs = new Set<() => void>();
const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
};
const emit = () => subs.forEach((cb) => cb());

export function useAdminState<T>(selector: (s: AdminState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

// Quick read accessor for non-component code
export const readState = <K extends keyof AdminState>(key: K) => state[key];

const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const nowISO = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Repo
// ---------------------------------------------------------------------------
export const adminRepo = {
  questions: {
    list: () => state.questions,
    get: (id: string) => state.questions.find((q) => q.id === id),
    create: (input: Partial<AdminQuestion>): AdminQuestion => {
      const q: AdminQuestion = {
        id: newId("q"),
        title: input.title ?? "Nová otázka",
        excerpt: input.excerpt ?? "",
        body: input.body ?? "",
        author_id: input.author_id ?? state.users[0]?.id ?? "system",
        author_name: input.author_name ?? state.users[0]?.display_name ?? "Admin",
        categories: input.categories ?? ["vseobecny"],
        status: input.status ?? "pending",
        answers_count: 0,
        votes: 0,
        reports_count: 0,
        created_at: nowISO(),
        answer_set_id: input.answer_set_id,
        correct_answer_ids: input.correct_answer_ids ?? [],
        incorrect_answer_ids: input.incorrect_answer_ids ?? [],
      };
      state.questions = [q, ...state.questions];
      emit();
      return q;
    },
    update: (id: string, patch: Partial<AdminQuestion>) => {
      state.questions = state.questions.map((q) => (q.id === id ? { ...q, ...patch } : q));
      emit();
    },
    remove: (id: string) => {
      state.questions = state.questions.filter((q) => q.id !== id);
      state.tests = state.tests.map((t) => ({
        ...t,
        question_ids: t.question_ids.filter((x) => x !== id),
      }));
      emit();
    },
    bulkUpdate: (ids: string[], patch: Partial<AdminQuestion>) => {
      const set = new Set(ids);
      state.questions = state.questions.map((q) => (set.has(q.id) ? { ...q, ...patch } : q));
      emit();
    },
    bulkRemove: (ids: string[]) => {
      const set = new Set(ids);
      state.questions = state.questions.filter((q) => !set.has(q.id));
      state.tests = state.tests.map((t) => ({
        ...t,
        question_ids: t.question_ids.filter((x) => !set.has(x)),
      }));
      emit();
    },
  },

  users: {
    list: () => state.users,
    get: (id: string) => state.users.find((u) => u.id === id),
    create: (input: Partial<AdminUser>): AdminUser => {
      const u: AdminUser = {
        id: newId("usr"),
        email: input.email ?? `user.${Date.now()}@subenai.sk`,
        display_name: input.display_name ?? "Nový používateľ",
        role: input.role ?? "user",
        status: input.status ?? "pending",
        questions_count: 0,
        created_at: nowISO(),
        last_active_at: nowISO(),
      };
      state.users = [u, ...state.users];
      emit();
      return u;
    },
    update: (id: string, patch: Partial<AdminUser>) => {
      state.users = state.users.map((u) => (u.id === id ? { ...u, ...patch } : u));
      emit();
    },
    remove: (id: string) => {
      state.users = state.users.filter((u) => u.id !== id);
      emit();
    },
    bulkUpdate: (ids: string[], patch: Partial<AdminUser>) => {
      const set = new Set(ids);
      state.users = state.users.map((u) => (set.has(u.id) ? { ...u, ...patch } : u));
      emit();
    },
    bulkRemove: (ids: string[]) => {
      const set = new Set(ids);
      state.users = state.users.filter((u) => !set.has(u.id));
      emit();
    },
  },

  tests: {
    list: () => state.tests,
    get: (id: string) =>
      state.tests.find((t) => t.id === id) ??
      (state.quickTest.id === id ? state.quickTest : undefined),
    create: (input: Partial<AdminTest>): AdminTest => {
      const t: AdminTest = {
        id: newId("test"),
        title: input.title ?? "Nový test",
        slug: input.slug ?? `test-${Date.now()}`,
        description: input.description ?? "",
        categories: input.categories ?? ["vseobecny"],
        difficulty: input.difficulty ?? "easy",
        status: input.status ?? "draft",
        time_limit_min: input.time_limit_min ?? 5,
        pass_score: input.pass_score ?? 60,
        is_quick: false,
        question_ids: input.question_ids ?? [],
        attempts: 0,
        updated_at: nowISO(),
      };
      state.tests = [t, ...state.tests];
      emit();
      return t;
    },
    update: (id: string, patch: Partial<AdminTest>) => {
      state.tests = state.tests.map((t) =>
        t.id === id ? { ...t, ...patch, updated_at: nowISO() } : t,
      );
      emit();
    },
    remove: (id: string) => {
      state.tests = state.tests.filter((t) => t.id !== id);
      emit();
    },
    bulkUpdate: (ids: string[], patch: Partial<AdminTest>) => {
      const set = new Set(ids);
      state.tests = state.tests.map((t) =>
        set.has(t.id) ? { ...t, ...patch, updated_at: nowISO() } : t,
      );
      emit();
    },
    bulkRemove: (ids: string[]) => {
      const set = new Set(ids);
      state.tests = state.tests.filter((t) => !set.has(t.id));
      emit();
    },
  },

  quickTest: {
    get: () => state.quickTest,
    update: (patch: Partial<AdminTest>) => {
      state.quickTest = { ...state.quickTest, ...patch, updated_at: nowISO() };
      emit();
    },
  },

  trainings: {
    list: () => state.trainings,
    get: (id: string) => state.trainings.find((t) => t.id === id),
    create: (input: Partial<AdminTraining>): AdminTraining => {
      const t: AdminTraining = {
        id: newId("tr"),
        title: input.title ?? "Nové školenie",
        topic: input.topic ?? "vseobecne",
        description: input.description ?? "",
        duration_min: input.duration_min ?? 5,
        status: input.status ?? "draft",
        views: 0,
        updated_at: nowISO(),
      };
      state.trainings = [t, ...state.trainings];
      emit();
      return t;
    },
    update: (id: string, patch: Partial<AdminTraining>) => {
      state.trainings = state.trainings.map((t) =>
        t.id === id ? { ...t, ...patch, updated_at: nowISO() } : t,
      );
      emit();
    },
    remove: (id: string) => {
      state.trainings = state.trainings.filter((t) => t.id !== id);
      emit();
    },
    bulkUpdate: (ids: string[], patch: Partial<AdminTraining>) => {
      const set = new Set(ids);
      state.trainings = state.trainings.map((t) =>
        set.has(t.id) ? { ...t, ...patch, updated_at: nowISO() } : t,
      );
      emit();
    },
    bulkRemove: (ids: string[]) => {
      const set = new Set(ids);
      state.trainings = state.trainings.filter((t) => !set.has(t.id));
      emit();
    },
  },

  answerSets: {
    list: () => state.answerSets,
    get: (id: string) => state.answerSets.find((s) => s.id === id),
    create: (input: Partial<AdminAnswerSet>): AdminAnswerSet => {
      const s: AdminAnswerSet = {
        id: newId("as"),
        name: input.name ?? "Nová sada",
        description: input.description ?? "",
        categories: input.categories ?? ["vseobecny"],
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      state.answerSets = [s, ...state.answerSets];
      emit();
      return s;
    },
    update: (id: string, patch: Partial<AdminAnswerSet>) => {
      state.answerSets = state.answerSets.map((s) =>
        s.id === id ? { ...s, ...patch, updated_at: nowISO() } : s,
      );
      emit();
    },
    remove: (id: string) => {
      state.answerSets = state.answerSets.filter((s) => s.id !== id);
      state.answers = state.answers.filter((a) => a.set_id !== id);
      state.questions = state.questions.map((q) =>
        q.answer_set_id === id
          ? { ...q, answer_set_id: undefined, correct_answer_ids: [], incorrect_answer_ids: [] }
          : q,
      );
      emit();
    },
  },

  answers: {
    list: (setId?: string) =>
      setId ? state.answers.filter((a) => a.set_id === setId) : state.answers,
    create: (input: Partial<AdminAnswer> & { set_id: string; text: string }): AdminAnswer => {
      const a: AdminAnswer = {
        id: newId("ans"),
        set_id: input.set_id,
        text: input.text,
        is_correct: input.is_correct ?? false,
        explanation: input.explanation,
        created_at: nowISO(),
      };
      state.answers = [a, ...state.answers];
      emit();
      return a;
    },
    update: (id: string, patch: Partial<AdminAnswer>) => {
      state.answers = state.answers.map((a) => (a.id === id ? { ...a, ...patch } : a));
      emit();
    },
    remove: (id: string) => {
      state.answers = state.answers.filter((a) => a.id !== id);
      state.questions = state.questions.map((q) => ({
        ...q,
        correct_answer_ids: q.correct_answer_ids.filter((x) => x !== id),
        incorrect_answer_ids: q.incorrect_answer_ids.filter((x) => x !== id),
      }));
      emit();
    },
  },

  reports: {
    list: () => state.reports,
    update: (id: string, patch: Partial<AdminReport>) => {
      state.reports = state.reports.map((r) => (r.id === id ? { ...r, ...patch } : r));
      emit();
    },
    remove: (id: string) => {
      state.reports = state.reports.filter((r) => r.id !== id);
      emit();
    },
    bulkUpdate: (ids: string[], patch: Partial<AdminReport>) => {
      const set = new Set(ids);
      state.reports = state.reports.map((r) => (set.has(r.id) ? { ...r, ...patch } : r));
      emit();
    },
    bulkRemove: (ids: string[]) => {
      const set = new Set(ids);
      state.reports = state.reports.filter((r) => !set.has(r.id));
      emit();
    },
  },

  categories: {
    list: () => state.categories,
    create: (input: Partial<AdminCategory>): AdminCategory => {
      const c: AdminCategory = {
        id: newId("cat"),
        name: input.name ?? "Nová kategória",
        slug: input.slug ?? `cat-${Date.now()}`,
        description: input.description ?? "",
        color: input.color ?? "#6366f1",
        questions_count: 0,
      };
      state.categories = [...state.categories, c];
      emit();
      return c;
    },
    update: (id: string, patch: Partial<AdminCategory>) => {
      state.categories = state.categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
      emit();
    },
    remove: (id: string) => {
      state.categories = state.categories.filter((c) => c.id !== id);
      emit();
    },
  },

  topics: {
    list: () => state.topics,
    create: (input: Partial<AdminTopic>): AdminTopic => {
      const t: AdminTopic = {
        id: newId("top"),
        name: input.name ?? "Nová téma",
        slug: input.slug ?? `top-${Date.now()}`,
        description: input.description ?? "",
        color: input.color ?? "#6366f1",
        trainings_count: 0,
      };
      state.topics = [...state.topics, t];
      emit();
      return t;
    },
    update: (id: string, patch: Partial<AdminTopic>) => {
      state.topics = state.topics.map((t) => (t.id === id ? { ...t, ...patch } : t));
      emit();
    },
    remove: (id: string) => {
      state.topics = state.topics.filter((t) => t.id !== id);
      emit();
    },
  },

  shareCard: {
    get: () => state.shareCard,
    update: (patch: Partial<ShareCardConfig>) => {
      state.shareCard = { ...state.shareCard, ...patch };
      emit();
    },
    reset: () => {
      state.shareCard = {
        ...defaultShareCard,
        tiers: defaultShareCard.tiers.map((t) => ({ ...t })),
      };
      emit();
    },
  },
};
