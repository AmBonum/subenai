// TanStack Query hooks for the user (/app/*) domain. AH-11.2a foundation —
// no consumers in this commit; AH-11.2b swaps consumers one domain at a
// time.
//
// All reads use the anon Supabase client (`@/integrations/supabase/client`).
// RLS filters every row by `auth.uid()` (or `is_team_member()` for
// team-shared rows after the AH-1.10 recursion fix), so listing endpoints
// require no client-side owner filter.
//
// Query key convention: ["user", <domain>, ...filters?]. Mutations
// invalidate the matching ["user", <domain>] root.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getCurrentLocale } from "@/i18n/locale-context";

import type { Option, Visual } from "@/lib/quiz/bank/questions";

import type {
  Audience,
  DSRRequest,
  DSRType,
  HistoryItem,
  LibraryQuestion,
  Notification,
  Profile,
  Respondent,
  RespondentGroup,
  Session,
  Team,
  TeamMember,
  Template,
  Test,
  TestStatus,
  TestVersion,
} from "./types";

// ---------------------------------------------------------------------------
// Mappers — DB row → UI shape
// ---------------------------------------------------------------------------

type TestsRow = {
  id: string;
  slug: string;
  share_id: string;
  owner_id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  status: string;
  version: number;
  password_hash: string | null;
  segmentation: string[];
  gdpr_purpose: string;
  intake_fields: unknown;
  branches: unknown;
  notif_config: unknown;
  anonymize_after_days: number | null;
  allow_behavioral_tracking: boolean;
  expires_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const mapTest = (row: TestsRow, question_ids: string[] = []): Test => ({
  id: row.id,
  slug: row.slug,
  share_id: row.share_id,
  owner_id: row.owner_id,
  team_id: row.team_id,
  title: row.title,
  description: row.description ?? "",
  status: (row.status as TestStatus) ?? "draft",
  version: row.version,
  // TODO: derive when AH-12 schema enrichment lands (separate password column)
  password: row.password_hash,
  segmentation: row.segmentation ?? [],
  gdpr_purpose: row.gdpr_purpose as Test["gdpr_purpose"],
  intake_fields: (row.intake_fields as Test["intake_fields"]) ?? [],
  question_ids,
  use_predefined_set: false,
  branches: (row.branches as Test["branches"]) ?? [],
  notif_config: row.notif_config as Test["notif_config"],
  anonymize_after_days: row.anonymize_after_days,
  allow_behavioral_tracking: row.allow_behavioral_tracking,
  expires_at: row.expires_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
  published_at: row.published_at,
});

type SessionsRow = {
  id: string;
  test_id: string;
  version: number;
  respondent_id: string | null;
  intake_data: unknown;
  consent_given: boolean;
  started_at: string;
  finished_at: string | null;
  score: number | null;
  status: string;
  segment: string | null;
  ip_hash: string | null;
};

const mapSession = (row: SessionsRow): Session => ({
  id: row.id,
  test_id: row.test_id,
  version: row.version,
  respondent_id: row.respondent_id ?? "",
  intake_data: (row.intake_data as Record<string, string>) ?? {},
  consent_given: row.consent_given,
  // TODO: derive when AH-12 schema enrichment lands (join session_answers)
  answers: [],
  started_at: row.started_at,
  finished_at: row.finished_at,
  score: row.score,
  status: row.status as Session["status"],
  segment: row.segment,
  ip_hash: row.ip_hash ?? "",
});

type RespondentGroupsRow = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  member_emails: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
};

const mapAudience = (row: RespondentGroupsRow): Audience => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  owner_id: row.owner_id,
  member_emails: row.member_emails ?? [],
  tags: row.tags ?? [],
  created_at: row.created_at,
  updated_at: row.updated_at,
});

type NotificationsRow = {
  id: string;
  user_id: string;
  event_type: string;
  test_id: string | null;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

const mapNotification = (row: NotificationsRow): Notification => ({
  id: row.id,
  user_id: row.user_id,
  event_type: row.event_type as Notification["event_type"],
  test_id: row.test_id,
  title: row.title,
  body: row.body ?? "",
  read_at: row.read_at,
  created_at: row.created_at,
});

type TeamsRow = { id: string; name: string; owner_id: string; created_at: string };

const mapTeam = (row: TeamsRow): Team => ({
  id: row.id,
  name: row.name,
  owner_id: row.owner_id,
  created_at: row.created_at,
});

type TeamMembersRow = {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
};

const mapTeamMember = (
  row: TeamMembersRow,
  profile?: { email: string | null; display_name: string | null },
): TeamMember => ({
  id: row.id,
  team_id: row.team_id,
  user_id: row.user_id,
  email: profile?.email ?? "",
  display_name: profile?.display_name ?? profile?.email ?? "",
  role: row.role as TeamMember["role"],
  joined_at: row.joined_at,
});

type ProfilesRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_initials: string | null;
  created_at: string;
};

const mapProfile = (row: ProfilesRow): Profile => ({
  id: row.id,
  email: row.email ?? "",
  display_name: row.display_name ?? row.email ?? "",
  avatar_initials: row.avatar_initials ?? "",
  created_at: row.created_at,
});

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

const mapDSR = (row: DsrRequestsRow): DSRRequest => ({
  id: row.id,
  requester_email: row.requester_email,
  type: row.type as DSRType,
  status: row.status as DSRRequest["status"],
  note: row.note ?? "",
  created_at: row.created_at,
  sla_due_at: row.sla_due_at,
  resolved_at: row.resolved_at,
});

type QuestionsRow = {
  id: string;
  prompt: string;
  branch_slug: string | null;
  difficulty: string | null;
  status: string;
  created_at: string;
};

const mapLibraryQuestion = (row: QuestionsRow): LibraryQuestion => ({
  id: row.id,
  prompt: row.prompt,
  branch_slug: row.branch_slug,
  difficulty: row.difficulty,
  status: row.status,
  created_at: row.created_at,
});

// ---------------------------------------------------------------------------
// Tests (user-owned + team-shared via RLS)
// ---------------------------------------------------------------------------

const TESTS_COLS =
  "id, slug, share_id, owner_id, team_id, title, description, status, version, password_hash, segmentation, gdpr_purpose, intake_fields, branches, notif_config, anonymize_after_days, allow_behavioral_tracking, expires_at, published_at, created_at, updated_at";

export function useTests() {
  return useQuery({
    queryKey: ["user", "tests"],
    queryFn: async (): Promise<Test[]> => {
      const { data, error } = await supabase
        .from("tests")
        .select(TESTS_COLS)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapTest(r as TestsRow));
    },
  });
}

export function useTest(id: string | undefined) {
  return useQuery({
    queryKey: ["user", "tests", id],
    enabled: !!id,
    queryFn: async (): Promise<Test | null> => {
      if (!id) return null;
      const [testRes, tqRes] = await Promise.all([
        supabase.from("tests").select(TESTS_COLS).eq("id", id).maybeSingle(),
        supabase
          .from("test_questions")
          .select("question_id, position")
          .eq("test_id", id)
          .order("position", { ascending: true }),
      ]);
      if (testRes.error) throw testRes.error;
      if (tqRes.error) throw tqRes.error;
      if (!testRes.data) return null;
      const qids = (tqRes.data ?? []).map((r) => (r as { question_id: string }).question_id);
      return mapTest(testRes.data as TestsRow, qids);
    },
  });
}

export function useCreateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Test> & { owner_id: string; title: string }) => {
      const { data, error } = await supabase
        .from("tests")
        .insert({
          slug: input.slug ?? `test-${Date.now()}`,
          share_id: input.share_id ?? crypto.randomUUID(),
          owner_id: input.owner_id,
          team_id: input.team_id ?? null,
          title: input.title,
          description: input.description ?? null,
          status: (input.status ?? "draft") as never,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "tests"] }),
  });
}

export function useUpdateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Test> }) => {
      const update: Record<string, unknown> = {};
      if (patch.title !== undefined) update.title = patch.title;
      if (patch.slug !== undefined) update.slug = patch.slug;
      if (patch.description !== undefined) update.description = patch.description;
      if (patch.status) update.status = patch.status;
      if (patch.segmentation) update.segmentation = patch.segmentation;
      if (patch.gdpr_purpose) update.gdpr_purpose = patch.gdpr_purpose;
      if (patch.expires_at !== undefined) update.expires_at = patch.expires_at;
      if (patch.anonymize_after_days !== undefined)
        update.anonymize_after_days = patch.anonymize_after_days;
      if (patch.allow_behavioral_tracking !== undefined)
        update.allow_behavioral_tracking = patch.allow_behavioral_tracking;
      update.updated_at = new Date().toISOString();
      const { error } = await supabase.from("tests").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "tests"] }),
  });
}

export function useDeleteTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "tests"] }),
  });
}

export function useDuplicateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error: e1 } = await supabase
        .from("tests")
        .select(TESTS_COLS)
        .eq("id", id)
        .maybeSingle();
      if (e1) throw e1;
      if (!src) throw new Error("Test not found");
      const row = src as TestsRow;
      const { data, error } = await supabase
        .from("tests")
        .insert({
          slug: `${row.slug}-copy-${Date.now()}`,
          share_id: crypto.randomUUID(),
          owner_id: row.owner_id,
          team_id: row.team_id,
          title: `${row.title} (kópia)`,
          description: row.description,
          status: "draft" as never,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "tests"] }),
  });
}

// ---------------------------------------------------------------------------
// Sessions (user's own + sessions for tests the user owns, via RLS)
// ---------------------------------------------------------------------------

const SESSIONS_COLS =
  "id, test_id, version, respondent_id, intake_data, consent_given, started_at, finished_at, score, status, segment, ip_hash";

export function useUserSessions() {
  return useQuery({
    queryKey: ["user", "sessions"],
    queryFn: async (): Promise<Session[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select(SESSIONS_COLS)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapSession(r as SessionsRow));
    },
  });
}

export function useUserSession(id: string | undefined) {
  return useQuery({
    queryKey: ["user", "sessions", id],
    enabled: !!id,
    queryFn: async (): Promise<Session | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("sessions")
        .select(SESSIONS_COLS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapSession(data as SessionsRow) : null;
    },
  });
}

// ---------------------------------------------------------------------------
// Audiences (respondent_groups)
// ---------------------------------------------------------------------------

const AUDIENCES_COLS =
  "id, name, description, owner_id, member_emails, tags, created_at, updated_at";

export function useAudiences() {
  return useQuery({
    queryKey: ["user", "audiences"],
    queryFn: async (): Promise<Audience[]> => {
      const { data, error } = await supabase
        .from("respondent_groups")
        .select(AUDIENCES_COLS)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapAudience(r as RespondentGroupsRow));
    },
  });
}

export function useAudience(id: string | undefined) {
  return useQuery({
    queryKey: ["user", "audiences", id],
    enabled: !!id,
    queryFn: async (): Promise<Audience | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("respondent_groups")
        .select(AUDIENCES_COLS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapAudience(data as RespondentGroupsRow) : null;
    },
  });
}

export function useCreateAudience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<RespondentGroup> & { owner_id: string; name: string }) => {
      const { data, error } = await supabase
        .from("respondent_groups")
        .insert({
          name: input.name,
          description: input.description ?? null,
          owner_id: input.owner_id,
          member_emails: input.member_emails ?? [],
          tags: input.tags ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "audiences"] }),
  });
}

export function useUpdateAudience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RespondentGroup> }) => {
      const update: Record<string, unknown> = {};
      if (patch.name !== undefined) update.name = patch.name;
      if (patch.description !== undefined) update.description = patch.description;
      if (patch.member_emails) update.member_emails = patch.member_emails;
      if (patch.tags) update.tags = patch.tags;
      update.updated_at = new Date().toISOString();
      const { error } = await supabase.from("respondent_groups").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "audiences"] }),
  });
}

export function useDeleteAudience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("respondent_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "audiences"] }),
  });
}

// ---------------------------------------------------------------------------
// Templates (E44 — ownership + visibility model)
//
// RLS enforces who sees what: every authenticated user reads platform
// defaults (owner_id IS NULL) + their own rows + public published rows.
// Mutations on owned rows are RLS-restricted to `owner_id = auth.uid()`;
// the explicit `.eq("owner_id", auth.uid())` filter in the mutations is
// defense in depth, not the gate.
// ---------------------------------------------------------------------------

type TemplatesRow = {
  id: string;
  title: string;
  description: string | null;
  question_ids: string[];
  gdpr_purpose: string;
  owner_id: string | null;
  visibility: string;
  fork_of: string | null;
  status: string;
  license: string;
  author_display_name: string | null;
  age_rating: string;
  slug: string | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

const TEMPLATES_COLS =
  "id, title, description, question_ids, gdpr_purpose, owner_id, visibility, fork_of, status, license, author_display_name, age_rating, slug, published_at, updated_at, created_at";

const mapTemplate = (row: TemplatesRow): Template => ({
  id: row.id,
  title: row.title,
  description: row.description ?? "",
  question_ids: row.question_ids ?? [],
  gdpr_purpose: row.gdpr_purpose as Template["gdpr_purpose"],
  owner_id: row.owner_id,
  visibility: row.visibility as Template["visibility"],
  fork_of: row.fork_of,
  status: row.status as Template["status"],
  license: row.license as Template["license"],
  author_display_name: row.author_display_name,
  age_rating: row.age_rating as Template["age_rating"],
  slug: row.slug,
  published_at: row.published_at,
  updated_at: row.updated_at,
  created_at: row.created_at,
});

async function fetchCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Public + platform-default rows visible to everyone (anon-readable
// portion of the table). UI: "Verejné" tab.
export function usePublicTemplates() {
  return useQuery({
    queryKey: ["user", "templates", "public"],
    queryFn: async (): Promise<Template[]> => {
      const { data, error } = await supabase
        .from("templates")
        .select(TEMPLATES_COLS)
        .or("owner_id.is.null,and(visibility.eq.public,status.eq.published)")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => mapTemplate(r as TemplatesRow));
    },
  });
}

// Only the caller's own rows (any visibility / status). UI: "Moje" tab.
export function useMyTemplates() {
  return useQuery({
    queryKey: ["user", "templates", "mine"],
    queryFn: async (): Promise<Template[]> => {
      const uid = await fetchCurrentUserId();
      if (!uid) return [];
      const { data, error } = await supabase
        .from("templates")
        .select(TEMPLATES_COLS)
        .eq("owner_id", uid)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapTemplate(r as TemplatesRow));
    },
  });
}

// Union view kept for legacy callers (e.g. /app/tests/new picker) that
// still want defaults + public + mine in one list. New UI uses the two
// dedicated hooks above.
export function useTemplates() {
  return useQuery({
    queryKey: ["user", "templates"],
    queryFn: async (): Promise<Template[]> => {
      const uid = await fetchCurrentUserId();
      const filter = uid
        ? `owner_id.is.null,owner_id.eq.${uid},and(visibility.eq.public,status.eq.published)`
        : "owner_id.is.null,and(visibility.eq.public,status.eq.published)";
      const { data, error } = await supabase
        .from("templates")
        .select(TEMPLATES_COLS)
        .or(filter)
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => mapTemplate(r as TemplatesRow));
    },
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["user", "templates", id],
    enabled: !!id,
    queryFn: async (): Promise<Template | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("templates")
        .select(TEMPLATES_COLS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapTemplate(data as TemplatesRow) : null;
    },
  });
}

// Duplicate any template the caller can read into a private copy they
// own. Sets `fork_of` for attribution + audit. Title gets a Slovak
// suffix unless the caller passes a custom one.
export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ source, title }: { source: Template; title?: string }) => {
      const uid = await fetchCurrentUserId();
      if (!uid) throw new Error("not_authenticated");
      const { data, error } = await supabase
        .from("templates")
        .insert({
          title: title ?? `${source.title} (kópia)`,
          description: source.description,
          question_ids: source.question_ids,
          gdpr_purpose: source.gdpr_purpose as never,
          owner_id: uid,
          visibility: "private",
          fork_of: source.id,
          status: "draft",
          age_rating: source.age_rating as never,
        })
        .select(TEMPLATES_COLS)
        .single();
      if (error) throw error;
      return mapTemplate(data as TemplatesRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "templates"] });
    },
  });
}

// Edit a row the caller owns. RLS rejects everything else.
export function useUpdateOwnTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Template> }) => {
      const uid = await fetchCurrentUserId();
      if (!uid) throw new Error("not_authenticated");
      const update: Record<string, unknown> = {};
      if (patch.title !== undefined) update.title = patch.title;
      if (patch.description !== undefined) update.description = patch.description;
      if (patch.question_ids) update.question_ids = patch.question_ids;
      if (patch.gdpr_purpose) update.gdpr_purpose = patch.gdpr_purpose;
      if (patch.age_rating) update.age_rating = patch.age_rating;
      const { error } = await supabase
        .from("templates")
        .update(update)
        .eq("id", id)
        .eq("owner_id", uid);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "templates"] });
    },
  });
}

// Delete a row the caller owns. RLS rejects everything else; the
// `forbid_default_template_mutation` trigger backstops platform defaults.
export function useDeleteOwnTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const uid = await fetchCurrentUserId();
      if (!uid) throw new Error("not_authenticated");
      const { error } = await supabase.from("templates").delete().eq("id", id).eq("owner_id", uid);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "templates"] });
    },
  });
}

/**
 * @deprecated E44 — admin-only path. Use `useDuplicateTemplate` for the
 * user-side "fork a default" flow. This shim stays only for legacy
 * admin code that may still call it; new code should use the
 * `/admin/templates` route's dedicated mutations (Phase C).
 */
export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Template> & { title: string }) => {
      const { data, error } = await supabase
        .from("templates")
        .insert({
          title: input.title,
          description: input.description ?? null,
          question_ids: input.question_ids ?? [],
          gdpr_purpose: (input.gdpr_purpose ?? "internal_training") as never,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "templates"] }),
  });
}

/** @deprecated E44 — use `useUpdateOwnTemplate`. */
export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Template> }) => {
      const update: Record<string, unknown> = {};
      if (patch.title !== undefined) update.title = patch.title;
      if (patch.description !== undefined) update.description = patch.description;
      if (patch.question_ids) update.question_ids = patch.question_ids;
      if (patch.gdpr_purpose) update.gdpr_purpose = patch.gdpr_purpose;
      const { error } = await supabase.from("templates").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "templates"] }),
  });
}

/** @deprecated E44 — use `useDeleteOwnTemplate`. */
export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "templates"] }),
  });
}

// ---------------------------------------------------------------------------
// History — finished sessions joined with their test title
// ---------------------------------------------------------------------------

export function useHistory(limit = 50) {
  return useQuery({
    queryKey: ["user", "history", limit],
    queryFn: async (): Promise<HistoryItem[]> => {
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("id, test_id, score, finished_at, status")
        .order("finished_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      const rows = (sessions ?? []) as {
        id: string;
        test_id: string;
        score: number | null;
        finished_at: string | null;
        status: string;
      }[];
      const ids = Array.from(new Set(rows.map((r) => r.test_id)));
      let titleMap = new Map<string, string>();
      if (ids.length) {
        const { data: tests, error: e2 } = await supabase
          .from("tests")
          .select("id, title")
          .in("id", ids);
        if (e2) throw e2;
        titleMap = new Map(
          ((tests ?? []) as { id: string; title: string }[]).map((t) => [t.id, t.title]),
        );
      }
      return rows.map((r) => ({
        id: r.id,
        test_id: r.test_id,
        test_title: titleMap.get(r.test_id) ?? "",
        score: r.score,
        finished_at: r.finished_at,
        status: r.status as HistoryItem["status"],
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

const NOTIF_COLS = "id, user_id, event_type, test_id, title, body, read_at, created_at";

export function useNotifications() {
  return useQuery({
    queryKey: ["user", "notifications"],
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select(NOTIF_COLS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapNotification(r as NotificationsRow));
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "notifications"] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "notifications"] }),
  });
}

// ---------------------------------------------------------------------------
// Teams + team members
// ---------------------------------------------------------------------------

export function useTeams() {
  return useQuery({
    queryKey: ["user", "teams"],
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, owner_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapTeam(r as TeamsRow));
    },
  });
}

export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: ["user", "teams", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const [teamRes, membersRes] = await Promise.all([
        supabase.from("teams").select("id, name, owner_id, created_at").eq("id", id).maybeSingle(),
        supabase
          .from("team_members")
          .select("id, team_id, user_id, role, joined_at")
          .eq("team_id", id),
      ]);
      if (teamRes.error) throw teamRes.error;
      if (membersRes.error) throw membersRes.error;
      if (!teamRes.data) return null;
      const memberRows = (membersRes.data ?? []) as TeamMembersRow[];
      const profileIds = memberRows.map((m) => m.user_id);
      let profileMap = new Map<string, ProfilesRow>();
      if (profileIds.length) {
        const { data: profiles, error: e3 } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_initials, created_at")
          .in("id", profileIds);
        if (e3) throw e3;
        profileMap = new Map(((profiles ?? []) as ProfilesRow[]).map((p) => [p.id, p]));
      }
      return {
        team: mapTeam(teamRes.data as TeamsRow),
        members: memberRows.map((m) => mapTeamMember(m, profileMap.get(m.user_id))),
      };
    },
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; owner_id: string }) => {
      const { data, error } = await supabase
        .from("teams")
        .insert({ name: input.name, owner_id: input.owner_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "teams"] }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Team> }) => {
      const update: Record<string, unknown> = {};
      if (patch.name !== undefined) update.name = patch.name;
      const { error } = await supabase.from("teams").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "teams"] }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "teams"] }),
  });
}

export function useInviteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { team_id: string; user_id: string; role: TeamMember["role"] }) => {
      const { data, error } = await supabase
        .from("team_members")
        .insert({
          team_id: input.team_id,
          user_id: input.user_id,
          role: input.role as never,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "teams"] });
      qc.invalidateQueries({ queryKey: ["user", "team_members"] });
    },
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "teams"] });
      qc.invalidateQueries({ queryKey: ["user", "team_members"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Profile (current authenticated user)
// ---------------------------------------------------------------------------

export function useCurrentProfile() {
  return useQuery({
    queryKey: ["user", "profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, display_name, avatar_initials, created_at")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data ? mapProfile(data as ProfilesRow) : null;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const update: Record<string, unknown> = {};
      if (patch.email !== undefined) update.email = patch.email;
      if (patch.display_name !== undefined) update.display_name = patch.display_name;
      if (patch.avatar_initials !== undefined) update.avatar_initials = patch.avatar_initials;
      const { error } = await supabase.from("profiles").update(update).eq("id", uid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "profile"] }),
  });
}

// ---------------------------------------------------------------------------
// DSR submit (user-side: open a new request)
// ---------------------------------------------------------------------------

export function useSubmitDSR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requester_email: string; type: DSRType; note?: string }) => {
      const now = Date.now();
      const { data, error } = await supabase
        .from("dsr_requests")
        .insert({
          requester_email: input.requester_email,
          type: input.type as never,
          note: input.note ?? null,
          status: "open" as never,
          sla_due_at: new Date(now + 30 * 86400000).toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data ? mapDSR(data as DsrRequestsRow) : null;
    },
    onSuccess: (created) => {
      if (created) {
        qc.setQueryData<DSRRequest[]>(["user", "dsr"], (prev) =>
          prev ? [created, ...prev] : [created],
        );
      }
      qc.invalidateQueries({ queryKey: ["user", "dsr"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Library questions (read-only, RLS scopes by team/visibility)
// ---------------------------------------------------------------------------

export function useLibraryQuestions(branchSlug?: string) {
  return useQuery({
    queryKey: ["user", "library_questions", branchSlug],
    queryFn: async (): Promise<LibraryQuestion[]> => {
      let q = supabase
        .from("questions")
        .select("id, prompt, branch_slug, difficulty, status, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (branchSlug) q = q.eq("branch_slug", branchSlug);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => mapLibraryQuestion(r as QuestionsRow));
    },
  });
}

// ---------------------------------------------------------------------------
// Respondents (RLS scopes to owners of the parent test / team)
// ---------------------------------------------------------------------------

type RespondentsRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  anonymized_at: string | null;
  created_at: string;
};

const mapRespondent = (row: RespondentsRow): Respondent => ({
  id: row.id,
  email: row.email,
  display_name: row.display_name,
  anonymized_at: row.anonymized_at,
  created_at: row.created_at,
});

export function useUserRespondents() {
  return useQuery({
    queryKey: ["user", "respondents"],
    queryFn: async (): Promise<Respondent[]> => {
      const { data, error } = await supabase
        .from("respondents")
        .select("id, email, display_name, anonymized_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapRespondent(r as RespondentsRow));
    },
  });
}

// ---------------------------------------------------------------------------
// Test versions (snapshot history; RLS via parent test)
// ---------------------------------------------------------------------------

type TestVersionsRow = {
  id: string;
  test_id: string;
  version: number;
  snapshot: unknown;
  published_at: string;
  published_by: string | null;
  changelog: string | null;
};

const mapTestVersion = (row: TestVersionsRow): TestVersion => {
  const snap = (row.snapshot ?? {}) as { title?: string; question_count?: number };
  return {
    id: row.id,
    test_id: row.test_id,
    version: row.version,
    snapshot_title: snap.title ?? "",
    snapshot_questions: snap.question_count ?? 0,
    published_at: row.published_at,
    published_by: row.published_by ?? "",
    changelog: row.changelog ?? "",
  };
};

export function useTestVersions(testId?: string) {
  return useQuery({
    queryKey: ["user", "test_versions", testId ?? "all"],
    queryFn: async (): Promise<TestVersion[]> => {
      let q = supabase
        .from("test_versions")
        .select("id, test_id, version, snapshot, published_at, published_by, changelog")
        .order("published_at", { ascending: false });
      if (testId) q = q.eq("test_id", testId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => mapTestVersion(r as TestVersionsRow));
    },
  });
}

// ---------------------------------------------------------------------------
// DSR list — the user's own submitted requests (RLS by requester_email match
// on the auth user's email).
// ---------------------------------------------------------------------------

export function useUserDSRList() {
  return useQuery({
    queryKey: ["user", "dsr"],
    queryFn: async (): Promise<DSRRequest[]> => {
      const { data, error } = await supabase
        .from("dsr_requests")
        .select("id, requester_email, type, status, note, created_at, sla_due_at, resolved_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapDSR(r as DsrRequestsRow));
    },
  });
}

// ---------------------------------------------------------------------------
// Team members — flat list across the user's teams (joined with profiles for
// display name + email). RLS on team_members filters by is_team_member().
// ---------------------------------------------------------------------------

export function useUserTeamMembers() {
  return useQuery({
    queryKey: ["user", "team_members"],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data: members, error } = await supabase
        .from("team_members")
        .select("id, team_id, user_id, role, joined_at");
      if (error) throw error;
      const rows = (members ?? []) as TeamMembersRow[];
      const profileIds = Array.from(new Set(rows.map((m) => m.user_id)));
      let profileMap = new Map<string, ProfilesRow>();
      if (profileIds.length) {
        const { data: profiles, error: e2 } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_initials, created_at")
          .in("id", profileIds);
        if (e2) throw e2;
        profileMap = new Map(((profiles ?? []) as ProfilesRow[]).map((p) => [p.id, p]));
      }
      return rows.map((m) => mapTeamMember(m, profileMap.get(m.user_id)));
    },
  });
}

// ---------------------------------------------------------------------------
// Test lifecycle helpers (publish + archive). Mirror mock-store semantics.
// ---------------------------------------------------------------------------

export function usePublishTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error: e1 } = await supabase
        .from("tests")
        .select("id, version, status, title")
        .eq("id", id)
        .maybeSingle();
      if (e1) throw e1;
      if (!src) throw new Error("Test not found");
      const row = src as { id: string; version: number; status: string; title: string };
      const newVersion = row.version + (row.status === "published" ? 1 : 0);
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("tests")
        .update({
          status: "published" as never,
          version: newVersion,
          published_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "tests"] });
      qc.invalidateQueries({ queryKey: ["user", "test_versions"] });
    },
  });
}

export function useArchiveTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tests")
        .update({ status: "archived" as never, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "tests"] }),
  });
}

// ---------------------------------------------------------------------------
// Team member role update.
// ---------------------------------------------------------------------------

export function useUpdateTeamMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: TeamMember["role"] }) => {
      const { error } = await supabase
        .from("team_members")
        .update({ role: role as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "teams"] });
      qc.invalidateQueries({ queryKey: ["user", "team_members"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Quick test questions (public /test — anonymous reads via SECURITY DEFINER
// RPC). Anonymous SELECT on `questions` is blocked by RLS; the
// `get_quick_test_questions` RPC is the only safe path. Returns DB-shape
// rows; the caller maps to the `Question` shape that QuestionCard renders
// via `src/lib/quiz/from-db.ts`.
// ---------------------------------------------------------------------------

export interface QuickTestQuestionRow {
  id: string;
  type: string;
  prompt: string;
  options: Option[];
  correct: number[];
  branch_slug: string;
  difficulty: string;
  visual: Visual | null;
  order_index: number;
}

export function useQuickTestQuestions(limit = 10) {
  // AH-15.7: locale is part of the cache key so switching language
  // re-fetches a localized payload instead of stale sk rows.
  const locale = getCurrentLocale();
  return useQuery<QuickTestQuestionRow[]>({
    queryKey: ["public", "quick-test-questions", limit, locale],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_quick_test_questions", {
        p_limit: limit,
        p_locale: locale,
      });
      if (error) throw error;
      return (data ?? []) as unknown as QuickTestQuestionRow[];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
