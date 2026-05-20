// Shared Supabase stub used by every admin Vitest spec. AH-11.1b swaps admin
// reads onto `useAdminX()` TanStack Query hooks backed by
// `@/integrations/supabase/client`; this stub seeds the same shapes
// `mock-data` provides so component renders match the legacy snapshot
// expectations and mutation-effect assertions still go through `mock-store`.
//
// Tests import { makeAdminSupabaseStub, adminMockTables } and hand the stub
// to `vi.mock("@/integrations/supabase/client", ...)`. A per-test reset is
// not required: each test gets a fresh QueryClient via `renderAdmin`, so
// cache is per-render. `adminMockTables` is mutable so a test can prepend a
// row before render if it needs custom state.

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
  dashboardStats,
  mockAdminActivity,
} from "@/lib/admin/mock-data";
import { SEED_DSR, SEED_RESPONDENTS } from "@/lib/platform/seed";
import { readState } from "@/lib/admin/mock-store";
import {
  seedPages as cmsSeedPages,
  seedHeader as cmsSeedHeader,
  seedFooter as cmsSeedFooter,
  seedNavigation as cmsSeedNavigation,
  seedShareCard as cmsSeedShareCard,
  seedQuickTestConfig as cmsSeedQuickTest,
} from "@/lib/admin/cms-mock-store";

type Row = Record<string, unknown>;

interface TableState {
  rows: Row[];
}

function makeTable(rows: Row[]): TableState {
  return { rows };
}

// DB-shape rows (queries.ts mappers expect snake_case columns).
const questionRows = (): Row[] =>
  mockQuestions.map((q) => ({
    id: q.id,
    prompt: q.body || q.title,
    branch_slug: q.categories[0] ?? null,
    author_id: q.author_id,
    status: q.status,
    answer_set_id: q.answer_set_id ?? null,
    created_at: q.created_at,
  }));

const answerSetRows = (): Row[] =>
  mockAnswerSets.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    branch_slugs: s.categories,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));

const answerRows = (): Row[] =>
  mockAnswers.map((a, i) => ({
    id: a.id,
    set_id: a.set_id,
    text: a.text,
    is_correct: a.is_correct,
    explanation: a.explanation ?? null,
    position: i,
  }));

const testRows = (): Row[] =>
  mockTests.map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    description: t.description,
    status: t.status,
    updated_at: t.updated_at,
  }));

const categoryRows = (): Row[] =>
  mockCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    color: c.color,
  }));

const topicRows = (): Row[] =>
  mockTopics.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    color: t.color,
  }));

const trainingRows = (): Row[] =>
  mockTrainings.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    topic_slug: t.topic,
    status: t.status,
    created_at: t.updated_at,
  }));

const reportRows = (): Row[] =>
  mockReports.map((r) => ({
    id: r.id,
    target_type: r.target_type,
    target_id: r.target_id,
    reason: r.reason,
    status: r.status,
    created_at: r.created_at,
  }));

const profileRows = (): Row[] =>
  mockUsers.map((u) => ({
    id: u.id,
    email: u.email,
    display_name: u.display_name,
    created_at: u.created_at,
  }));

const userRoleRows = (): Row[] => mockUsers.map((u) => ({ user_id: u.id, role: u.role }));

const auditLogRows = (): Row[] =>
  mockAdminActivity.map((a) => ({
    id: a.id,
    actor_id: null,
    actor_name: a.actor,
    action: a.summary.split(" ")[0] ?? a.type,
    target_type: a.type.includes("test")
      ? "test"
      : a.type.includes("report")
        ? "report"
        : a.type.includes("training")
          ? "training"
          : "question",
    target_id: a.id,
    pii_access: false,
    details: a.summary,
    at: a.created_at,
  }));

const dsrRows = (): Row[] =>
  SEED_DSR.map((d) => ({
    id: d.id,
    requester_email: d.requester_email,
    type: d.type,
    status: d.status,
    note: d.note ?? null,
    created_at: d.created_at,
    sla_due_at: d.sla_due_at,
    resolved_at: d.resolved_at,
  }));

const respondentRows = (): Row[] =>
  SEED_RESPONDENTS.map((r) => ({
    id: r.id,
    email: r.email ?? null,
    display_name: r.display_name ?? null,
    anonymized_at: r.anonymized_at ?? null,
    created_at: r.created_at,
  }));

// AH-11.5a — CMS tables. Routes read these through `useCmsX()` hooks in
// queries.ts; tests assert mutation calls through `adminMockRecorded`.
const cmsPageRows = (): Row[] =>
  cmsSeedPages.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    seo_description: p.seo_description,
    blocks: p.content_blocks.map((b) => ({ ...b })),
    status: p.status,
    published_at: p.published_at,
    updated_at: p.updated_at,
  }));

const cmsHeaderRow = (): Row => ({
  id: 1,
  logo: cmsSeedHeader.logo_url,
  nav: {
    cta_label: cmsSeedHeader.cta_label,
    cta_url: cmsSeedHeader.cta_url,
    mobile_trigger_label: cmsSeedHeader.mobile_trigger_label,
  },
});

const cmsFooterRow = (): Row => ({
  id: 1,
  columns: cmsSeedFooter.columns.map((c) => ({ ...c, links: c.links.map((l) => ({ ...l })) })),
  socials: cmsSeedFooter.socials.map((s) => ({ ...s })),
});

const cmsNavigationRow = (): Row => ({
  id: 1,
  items: cmsSeedNavigation.map((n) => ({ ...n })),
});

const shareCardRow = (): Row => ({
  id: 1,
  branding: {
    og_template_url: cmsSeedShareCard.og_template_url,
    title_fallback: cmsSeedShareCard.title_fallback,
    description_fallback: cmsSeedShareCard.description_fallback,
  },
});

const quickTestRow = (): Row => ({
  id: 1,
  config: { ...cmsSeedQuickTest, question_ids: [...cmsSeedQuickTest.question_ids] },
});

export interface AdminMockTables {
  questions: TableState;
  answer_sets: TableState;
  answers: TableState;
  tests: TableState;
  test_questions: TableState;
  categories: TableState;
  topics: TableState;
  trainings: TableState;
  reports: TableState;
  profiles: TableState;
  user_roles: TableState;
  audit_log: TableState;
  dsr_requests: TableState;
  respondents: TableState;
  sessions: TableState;
  cms_pages: TableState;
  cms_header: TableState;
  cms_footer: TableState;
  cms_navigation: TableState;
  share_card_config: TableState;
  quick_test_config: TableState;
}

export const adminMockTables: AdminMockTables = {
  questions: makeTable(questionRows()),
  answer_sets: makeTable(answerSetRows()),
  answers: makeTable(answerRows()),
  tests: makeTable(testRows()),
  test_questions: makeTable([]),
  categories: makeTable(categoryRows()),
  topics: makeTable(topicRows()),
  trainings: makeTable(trainingRows()),
  reports: makeTable(reportRows()),
  profiles: makeTable(profileRows()),
  user_roles: makeTable(userRoleRows()),
  audit_log: makeTable(auditLogRows()),
  dsr_requests: makeTable(dsrRows()),
  respondents: makeTable(respondentRows()),
  sessions: makeTable([]),
  cms_pages: makeTable(cmsPageRows()),
  cms_header: makeTable([cmsHeaderRow()]),
  cms_footer: makeTable([cmsFooterRow()]),
  cms_navigation: makeTable([cmsNavigationRow()]),
  share_card_config: makeTable([shareCardRow()]),
  quick_test_config: makeTable([quickTestRow()]),
};

export function resetAdminMockTables() {
  adminMockTables.questions.rows = questionRows();
  adminMockTables.answer_sets.rows = answerSetRows();
  adminMockTables.answers.rows = answerRows();
  adminMockTables.tests.rows = testRows();
  adminMockTables.test_questions.rows = [];
  adminMockTables.categories.rows = categoryRows();
  adminMockTables.topics.rows = topicRows();
  adminMockTables.trainings.rows = trainingRows();
  adminMockTables.reports.rows = reportRows();
  adminMockTables.profiles.rows = profileRows();
  adminMockTables.user_roles.rows = userRoleRows();
  adminMockTables.audit_log.rows = auditLogRows();
  adminMockTables.dsr_requests.rows = dsrRows();
  adminMockTables.respondents.rows = respondentRows();
  adminMockTables.sessions.rows = [];
  adminMockTables.cms_pages.rows = cmsPageRows();
  adminMockTables.cms_header.rows = [cmsHeaderRow()];
  adminMockTables.cms_footer.rows = [cmsFooterRow()];
  adminMockTables.cms_navigation.rows = [cmsNavigationRow()];
  adminMockTables.share_card_config.rows = [shareCardRow()];
  adminMockTables.quick_test_config.rows = [quickTestRow()];
}

// ---- chainable PostgREST-shaped query builder stub ----

interface QueryState {
  table: string;
  filters: Array<(r: Row) => boolean>;
  isHead: boolean;
  wantCount: boolean;
  limitN?: number;
  single: boolean;
  maybeSingle: boolean;
}

function applyFilters(rows: Row[], filters: QueryState["filters"]): Row[] {
  let out = rows;
  for (const f of filters) out = out.filter(f);
  return out;
}

function makeBuilder(state: QueryState): unknown {
  const settle = async () => {
    const tbl = adminMockTables[state.table as keyof AdminMockTables];
    const rows = tbl ? applyFilters(tbl.rows, state.filters) : [];
    if (state.wantCount && state.isHead) {
      return { data: null, count: rows.length, error: null };
    }
    if (state.single) {
      return {
        data: rows[0] ?? null,
        error: rows[0] ? null : new Error("not_found"),
        count: rows.length,
      };
    }
    if (state.maybeSingle) {
      return { data: rows[0] ?? null, error: null, count: rows.length };
    }
    const sliced = state.limitN ? rows.slice(0, state.limitN) : rows;
    return { data: sliced, error: null, count: rows.length };
  };

  const builder: Record<string, unknown> = {
    eq(col: string, val: unknown) {
      state.filters.push((r) => r[col] === val);
      return builder;
    },
    in(col: string, vals: unknown[]) {
      state.filters.push((r) => vals.includes(r[col]));
      return builder;
    },
    not(col: string, op: string, val: unknown) {
      // Only `is null` negation is used by queries.ts today; keep the
      // implementation tight rather than building a full PostgREST shim.
      if (op === "is" && val === null) {
        state.filters.push((r) => r[col] !== null && r[col] !== undefined);
      }
      return builder;
    },
    order() {
      return builder;
    },
    limit(n: number) {
      state.limitN = n;
      return builder;
    },
    single() {
      state.single = true;
      return settle();
    },
    maybeSingle() {
      state.maybeSingle = true;
      return settle();
    },
    then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
      return settle().then(onFulfilled, onRejected);
    },
  };
  return builder;
}

// AH-11.1c: tests assert on these to verify the mutation reached Supabase
// (instead of mock-store, which was the assertion surface in 11.1a/b).
export interface AdminMockRecorded {
  inserts: Array<{ table: string; values: Row }>;
  updates: Array<{ table: string; patch: Row; match: Record<string, unknown> }>;
  deletes: Array<{ table: string; match: Record<string, unknown> }>;
}

export const adminMockRecorded: AdminMockRecorded = {
  inserts: [],
  updates: [],
  deletes: [],
};

export function resetAdminMockRecorded(): void {
  adminMockRecorded.inserts = [];
  adminMockRecorded.updates = [];
  adminMockRecorded.deletes = [];
}

export function makeAdminSupabaseStub() {
  return {
    from(table: string) {
      return {
        select(_cols: string, opts?: { count?: string; head?: boolean }) {
          const state: QueryState = {
            table,
            filters: [],
            isHead: opts?.head ?? false,
            wantCount: !!opts?.count,
            single: false,
            maybeSingle: false,
          };
          return makeBuilder(state);
        },
        insert(values: Row) {
          const tbl = adminMockTables[table as keyof AdminMockTables];
          const row = {
            id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            ...values,
          };
          if (tbl) tbl.rows = [row, ...tbl.rows];
          adminMockRecorded.inserts.push({ table, values: row });
          return {
            select() {
              return {
                single: async () => ({ data: row, error: null }),
              };
            },
          };
        },
        update(patch: Row) {
          return {
            eq: (col: string, val: unknown) => {
              const tbl = adminMockTables[table as keyof AdminMockTables];
              if (tbl) {
                tbl.rows = tbl.rows.map((r) => (r[col] === val ? { ...r, ...patch } : r));
              }
              // Record synchronously so tests can assert without awaiting the
              // mutation's microtask chain.
              adminMockRecorded.updates.push({ table, patch, match: { [col]: val } });
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
        delete() {
          return {
            eq: (col: string, val: unknown) => {
              const tbl = adminMockTables[table as keyof AdminMockTables];
              if (tbl) tbl.rows = tbl.rows.filter((r) => r[col] !== val);
              adminMockRecorded.deletes.push({ table, match: { [col]: val } });
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
    // Dashboard counts also call .from(...).select(...); covered by builder.
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: (_cb: unknown) => ({
        data: { subscription: { unsubscribe: () => {} } },
        error: null,
      }),
      signInWithOtp: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    rpc: async () => ({ data: null, error: null }),
  };
}

// re-export for tests that want to assert raw seed shapes.
export { dashboardStats };

// ---- prefetch helper: seed every admin query key with the UI shape ----
// Mirrors the queries.ts mappers so component renders find data SYNC on first
// pass. Keeps tests deterministic without per-test `waitFor` plumbing.
import type { QueryClient } from "@tanstack/react-query";
import {
  type AdminAnswer,
  type AdminAnswerSet,
  type AdminCategory,
  type AdminQuestion,
  type AdminReport,
  type AdminTest,
  type AdminTopic,
  type AdminTraining,
  type AdminUser,
} from "@/lib/admin/mock-data";

// Read the latest mock-store state and refresh `adminMockTables` so query
// prefetches reflect rows created via `adminRepo.X.create()` in test setup
// blocks (AH-11.1b mutations still go through mock-store; reads go through
// these tables → keep them coherent for the duration of a test).
function syncAdminTablesFromMockStore(): void {
  const categories = readState("categories");
  const topics = readState("topics");
  const trainings = readState("trainings");
  const questions = readState("questions");
  const tests = readState("tests");
  const reports = readState("reports");
  const answerSets = readState("answerSets");
  const answers = readState("answers");
  const users = readState("users");

  adminMockTables.categories.rows = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    color: c.color,
  }));
  adminMockTables.topics.rows = topics.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    color: t.color,
  }));
  adminMockTables.trainings.rows = trainings.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    topic_slug: t.topic,
    status: t.status,
    created_at: t.updated_at,
  }));
  adminMockTables.questions.rows = questions.map((q) => ({
    id: q.id,
    prompt: q.body || q.title,
    branch_slug: q.categories[0] ?? null,
    author_id: q.author_id,
    status: q.status,
    answer_set_id: q.answer_set_id ?? null,
    created_at: q.created_at,
  }));
  adminMockTables.tests.rows = tests.map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    description: t.description,
    status: t.status,
    updated_at: t.updated_at,
  }));
  adminMockTables.reports.rows = reports.map((r) => ({
    id: r.id,
    target_type: r.target_type,
    target_id: r.target_id,
    reason: r.reason,
    status: r.status,
    created_at: r.created_at,
  }));
  adminMockTables.answer_sets.rows = answerSets.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    branch_slugs: s.categories,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));
  adminMockTables.answers.rows = answers.map((a, i) => ({
    id: a.id,
    set_id: a.set_id,
    text: a.text,
    is_correct: a.is_correct,
    explanation: a.explanation ?? null,
    position: i,
  }));
  adminMockTables.profiles.rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    display_name: u.display_name,
    created_at: u.created_at,
  }));
  adminMockTables.user_roles.rows = users.map((u) => ({ user_id: u.id, role: u.role }));
}

export function seedAdminQueryClient(qc: QueryClient): void {
  syncAdminTablesFromMockStore();
  // Questions
  const questions: AdminQuestion[] = adminMockTables.questions.rows.map((r) => ({
    id: r.id as string,
    title: ((r.prompt as string) ?? "").split("\n")[0] ?? "",
    excerpt: ((r.prompt as string) ?? "").slice(0, 140),
    body: (r.prompt as string) ?? "",
    author_id: (r.author_id as string) ?? "",
    author_name: "",
    categories: r.branch_slug ? [r.branch_slug as string] : [],
    status: (r.status as AdminQuestion["status"]) ?? "pending",
    answers_count: 0,
    votes: 0,
    reports_count: 0,
    created_at: r.created_at as string,
    answer_set_id: (r.answer_set_id as string | undefined) ?? undefined,
    correct_answer_ids: [],
    incorrect_answer_ids: [],
  }));
  qc.setQueryData(["admin", "questions"], questions);

  // Answer sets
  const answerSets: AdminAnswerSet[] = adminMockTables.answer_sets.rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? "",
    categories: (r.branch_slugs as string[]) ?? [],
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
  qc.setQueryData(["admin", "answer_sets"], answerSets);

  // Answers
  const answers: AdminAnswer[] = adminMockTables.answers.rows.map((r) => ({
    id: r.id as string,
    set_id: r.set_id as string,
    text: r.text as string,
    is_correct: r.is_correct as boolean,
    explanation: (r.explanation as string | null) ?? undefined,
    created_at: new Date(0).toISOString(),
  }));
  qc.setQueryData(["admin", "answers"], answers);

  // Tests
  const tests: AdminTest[] = adminMockTables.tests.rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    slug: r.slug as string,
    description: (r.description as string) ?? "",
    categories: [],
    difficulty: "medium",
    status: (r.status as AdminTest["status"]) ?? "draft",
    time_limit_min: 0,
    pass_score: 60,
    is_quick: false,
    question_ids: [],
    attempts: 0,
    updated_at: r.updated_at as string,
  }));
  qc.setQueryData(["admin", "tests"], tests);
  // Per-test detail keys: seed each so useAdminTest(id) is sync. Preserve
  // question_ids from the mock-data seed (DB has separate test_questions
  // join — the stub flattens it onto the detail row).
  const mockTestsRef = mockTests;
  for (const t of tests) {
    const seed = mockTestsRef.find((x) => x.id === t.id);
    qc.setQueryData(["admin", "tests", t.id], {
      ...t,
      categories: seed?.categories ?? t.categories,
      difficulty: seed?.difficulty ?? t.difficulty,
      time_limit_min: seed?.time_limit_min ?? t.time_limit_min,
      pass_score: seed?.pass_score ?? t.pass_score,
      question_ids: seed?.question_ids ?? [],
    });
  }

  // Categories + topics
  const categories: AdminCategory[] = adminMockTables.categories.rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    description: (r.description as string) ?? "",
    color: (r.color as string) ?? "#64748b",
    questions_count: 0,
  }));
  qc.setQueryData(["admin", "categories"], categories);

  const topics: AdminTopic[] = adminMockTables.topics.rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    description: (r.description as string) ?? "",
    color: (r.color as string) ?? "#64748b",
    trainings_count: 0,
  }));
  qc.setQueryData(["admin", "topics"], topics);

  // Trainings
  const trainings: AdminTraining[] = adminMockTables.trainings.rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    topic: (r.topic_slug as string) ?? "vseobecne",
    description: (r.description as string) ?? "",
    duration_min: 0,
    status: (r.status as AdminTraining["status"]) ?? "draft",
    views: 0,
    updated_at: r.created_at as string,
  }));
  qc.setQueryData(["admin", "trainings"], trainings);

  // Reports
  const reports: AdminReport[] = adminMockTables.reports.rows.map((r) => ({
    id: r.id as string,
    target_type: r.target_type as AdminReport["target_type"],
    target_id: r.target_id as string,
    target_label: r.target_id as string,
    reason: r.reason as AdminReport["reason"],
    status: r.status as AdminReport["status"],
    reporter_name: "",
    created_at: r.created_at as string,
  }));
  qc.setQueryData(["admin", "reports"], reports);

  // Users (profiles join user_roles)
  const roleMap = new Map<string, string>(
    adminMockTables.user_roles.rows.map((r) => [r.user_id as string, r.role as string]),
  );
  const users: AdminUser[] = adminMockTables.profiles.rows.map((p) => ({
    id: p.id as string,
    email: (p.email as string) ?? "",
    display_name: (p.display_name as string) ?? "",
    role: (roleMap.get(p.id as string) ?? "user") as AdminUser["role"],
    status: "active",
    questions_count: 0,
    created_at: p.created_at as string,
    last_active_at: p.created_at as string,
  }));
  qc.setQueryData(["admin", "users"], users);

  // Audit log + activity (default limit 100 / 20)
  qc.setQueryData(["admin", "audit_log", 100], adminMockTables.audit_log.rows);
  const activity = adminMockTables.audit_log.rows.slice(0, 20).map((r) => {
    const type =
      r.target_type === "test"
        ? "test_published"
        : r.target_type === "report"
          ? "report_filed"
          : r.action === "user_signup"
            ? "user_signup"
            : "question_created";
    return {
      id: r.id as string,
      type,
      actor: (r.actor_name as string) ?? "system",
      summary: `${r.action as string}${r.target_type ? ` ${r.target_type as string}` : ""}`,
      created_at: r.at as string,
    };
  });
  qc.setQueryData(["admin", "activity", 20], activity);

  // Respondents / DSR queue: empty until tests seed.
  qc.setQueryData(["admin", "respondents"], adminMockTables.respondents.rows);
  qc.setQueryData(["admin", "dsr_requests"], adminMockTables.dsr_requests.rows);

  // CMS — pages list + per-singleton config. Reads through ["admin","cms",X].
  qc.setQueryData(
    ["admin", "cms", "pages"],
    adminMockTables.cms_pages.rows.map((r) => ({
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      seo_description: (r.seo_description as string) ?? "",
      content_blocks: Array.isArray(r.blocks) ? (r.blocks as Row[]) : [],
      status: (r.status as string) ?? "draft",
      published_at: (r.published_at as string | null) ?? null,
      updated_at: r.updated_at as string,
    })),
  );
  const headerRow = adminMockTables.cms_header.rows[0] ?? {};
  const headerNav = (headerRow.nav as Row | null) ?? {};
  qc.setQueryData(["admin", "cms", "header"], {
    logo_url: (headerRow.logo as string) ?? "",
    cta_label: (headerNav.cta_label as string) ?? "",
    cta_url: (headerNav.cta_url as string) ?? "",
    mobile_trigger_label: (headerNav.mobile_trigger_label as string) ?? "",
  });
  const footerRow = adminMockTables.cms_footer.rows[0] ?? {};
  qc.setQueryData(["admin", "cms", "footer"], {
    columns: Array.isArray(footerRow.columns) ? footerRow.columns : [],
    socials: Array.isArray(footerRow.socials) ? footerRow.socials : [],
  });
  const navRow = adminMockTables.cms_navigation.rows[0] ?? {};
  qc.setQueryData(["admin", "cms", "navigation"], Array.isArray(navRow.items) ? navRow.items : []);
  const scRow = adminMockTables.share_card_config.rows[0] ?? {};
  const scBranding = (scRow.branding as Row | null) ?? {};
  qc.setQueryData(["admin", "cms", "share_card"], {
    og_template_url: (scBranding.og_template_url as string) ?? "",
    title_fallback: (scBranding.title_fallback as string) ?? "",
    description_fallback: (scBranding.description_fallback as string) ?? "",
  });
  const qtRow = adminMockTables.quick_test_config.rows[0] ?? {};
  qc.setQueryData(["admin", "cms", "quick_test"], {
    ...((qtRow.config as Row) ?? {}),
  });

  // Dashboard stats
  qc.setQueryData(["admin", "dashboard_stats"], {
    total_users: adminMockTables.profiles.rows.length,
    active_users_7d: 0,
    total_questions: adminMockTables.questions.rows.length,
    pending_review: adminMockTables.questions.rows.filter(
      (r) => r.status === "pending" || r.status === "flagged",
    ).length,
    total_answers: 0,
    open_reports: adminMockTables.reports.rows.filter((r) => r.status === "open").length,
    total_trainings: adminMockTables.trainings.rows.length,
    training_views: 0,
    total_tests: adminMockTables.tests.rows.length,
    total_sessions: 0,
    pending_dsr: 0,
    pending_dpa: 0,
  });
}
