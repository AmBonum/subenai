// AH-11.6 carve-out — platform mock store, retained for
// /app/tests/new + /app/library (questions library), the respondent flow
// (`@/lib/respondent/mock-store`), and the composer/test-packs/seed paths.
// The /app/* questions usage is an AH-12 schema-gap exemption: the
// production `questions` table lacks `type` and `category` columns.
// AH-14 finishes the schema enrichment and these consumers swap to
// `useLibraryQuestions`; the respondent reads migrate via the
// `get_test_by_share_id` RPC. After both, this file is deletable.
import { useSyncExternalStore } from "react";
import {
  CURRENT_USER_ID,
  SEED_ASSIGNMENTS,
  SEED_AUDIT,
  SEED_BEHAVIORAL_EVENTS,
  SEED_DSR,
  SEED_GROUPS,
  SEED_NOTIFICATIONS,
  SEED_QUESTIONS,
  SEED_RESPONDENTS,
  SEED_SESSIONS,
  SEED_TEAM_MEMBERS,
  SEED_TEAMS,
  SEED_TEMPLATES,
  SEED_TESTS,
  SEED_TEST_VERSIONS,
  SEED_USERS,
} from "./seed";
import type {
  AuditLogEntry,
  BehavioralEvent,
  DSRRequest,
  GroupAssignment,
  Notification,
  Question,
  Respondent,
  RespondentGroup,
  Session,
  Team,
  TeamMember,
  Template,
  Test,
  TestVersion,
  User,
} from "./types";

interface DB {
  users: User[];
  teams: Team[];
  teamMembers: TeamMember[];
  questions: Question[];
  tests: Test[];
  testVersions: TestVersion[];
  respondents: Respondent[];
  sessions: Session[];
  behavioralEvents: BehavioralEvent[];
  notifications: Notification[];
  audit: AuditLogEntry[];
  dsr: DSRRequest[];
  templates: Template[];
  groups: RespondentGroup[];
  assignments: GroupAssignment[];
}

const db: DB = {
  users: SEED_USERS,
  teams: SEED_TEAMS,
  teamMembers: SEED_TEAM_MEMBERS,
  questions: SEED_QUESTIONS,
  tests: SEED_TESTS,
  testVersions: SEED_TEST_VERSIONS,
  respondents: SEED_RESPONDENTS,
  sessions: SEED_SESSIONS,
  behavioralEvents: SEED_BEHAVIORAL_EVENTS,
  notifications: SEED_NOTIFICATIONS,
  audit: SEED_AUDIT,
  dsr: SEED_DSR,
  templates: SEED_TEMPLATES,
  groups: SEED_GROUPS,
  assignments: SEED_ASSIGNMENTS,
};

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());

function makeHook<T>(getter: (d: DB) => T) {
  return () =>
    useSyncExternalStore(
      subscribe,
      () => getter(db),
      () => getter(db),
    );
}

export const useTests = makeHook((d) => d.tests);
export const useQuestions = makeHook((d) => d.questions);
export const useTeams = makeHook((d) => d.teams);
export const useTeamMembers = makeHook((d) => d.teamMembers);
export const useRespondents = makeHook((d) => d.respondents);
export const useSessions = makeHook((d) => d.sessions);
export const useBehavioralEvents = makeHook((d) => d.behavioralEvents);
export const useNotifications = makeHook((d) => d.notifications);
export const useAudit = makeHook((d) => d.audit);
export const useDSR = makeHook((d) => d.dsr);
export const useTemplates = makeHook((d) => d.templates);
export const useUsers = makeHook((d) => d.users);
export const useTestVersions = makeHook((d) => d.testVersions);

// ---------- Selectors ----------
export const getTest = (id: string) => db.tests.find((t) => t.id === id);
export const getTestByShareId = (sid: string) => db.tests.find((t) => t.share_id === sid);
export const getRespondent = (id: string) => db.respondents.find((r) => r.id === id);
export const getQuestion = (id: string) => db.questions.find((q) => q.id === id);
export const getSession = (id: string) => db.sessions.find((s) => s.id === id);
export const sessionsForTest = (testId: string) => db.sessions.filter((s) => s.test_id === testId);
export const versionsForTest = (testId: string) =>
  db.testVersions.filter((v) => v.test_id === testId);
export const auditForTarget = (type: string, id: string) =>
  db.audit.filter((a) => a.target_type === type && a.target_id === id);

// ---------- Mutations ----------
export const currentUserId = () => CURRENT_USER_ID;
export const currentUser = () => db.users.find((u) => u.id === CURRENT_USER_ID)!;
export const useCurrentUser = makeHook((d) => d.users.find((u) => u.id === CURRENT_USER_ID)!);

export const updateCurrentUser = (
  patch: Partial<Pick<User, "display_name" | "email" | "avatar_initials">>,
) => {
  db.users = db.users.map((u) => {
    if (u.id !== CURRENT_USER_ID) return u;
    const next = { ...u, ...patch };
    if (patch.display_name && !patch.avatar_initials) {
      next.avatar_initials =
        patch.display_name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("") || u.avatar_initials;
    }
    return next;
  });
  log({
    action: "user.profile_update",
    target_type: "user",
    target_id: CURRENT_USER_ID,
    pii_access: true,
    details: "Používateľ upravil svoje údaje (meno / e-mail).",
  });
  emit();
};

const log = (entry: Omit<AuditLogEntry, "id" | "at" | "actor_id" | "actor_name">) => {
  const u = currentUser();
  db.audit = [
    {
      ...entry,
      id: `aud_${Date.now()}`,
      at: new Date().toISOString(),
      actor_id: u.id,
      actor_name: u.display_name,
    },
    ...db.audit,
  ];
};

export const updateTest = (id: string, patch: Partial<Test>) => {
  db.tests = db.tests.map((t) =>
    t.id === id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t,
  );
  log({
    action: "test.update",
    target_type: "test",
    target_id: id,
    pii_access: false,
    details: "Test aktualizovaný.",
  });
  emit();
};

export const publishTest = (id: string) => {
  const t = getTest(id);
  if (!t) return;
  const newVersion = t.version + (t.status === "published" ? 1 : 0);
  db.tests = db.tests.map((x) =>
    x.id === id
      ? {
          ...x,
          status: "published" as const,
          version: newVersion,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : x,
  );
  db.testVersions = [
    ...db.testVersions,
    {
      id: `tv_${id}_${newVersion}`,
      test_id: id,
      version: newVersion,
      snapshot_title: t.title,
      snapshot_questions: t.question_ids.length,
      published_at: new Date().toISOString(),
      published_by: currentUserId(),
      changelog: `Publikovaná verzia ${newVersion}`,
    },
  ];
  log({
    action: "test.publish",
    target_type: "test",
    target_id: id,
    pii_access: false,
    details: `Verzia ${newVersion} publikovaná.`,
  });
  emit();
};

export const archiveTest = (id: string) => {
  db.tests = db.tests.map((t) =>
    t.id === id ? { ...t, status: "archived" as const, updated_at: new Date().toISOString() } : t,
  );
  log({
    action: "test.archive",
    target_type: "test",
    target_id: id,
    pii_access: false,
    details: "Test archivovaný.",
  });
  emit();
};

export const createTest = (input: Partial<Test> & { title: string }) => {
  const id = `tst_${Date.now().toString(36)}`;
  const shareId = Math.random().toString(36).slice(2, 10);
  const t: Test = {
    id,
    slug: id,
    share_id: shareId,
    owner_id: currentUserId(),
    team_id: "team_001",
    title: input.title,
    description: input.description ?? "",
    status: "draft",
    version: 1,
    password: input.password ?? null,
    segmentation: input.segmentation ?? [],
    gdpr_purpose: input.gdpr_purpose ?? "internal_training",
    intake_fields: input.intake_fields ?? [
      { id: "if_email", label: "E-mail", type: "email", required: true, pii: true },
    ],
    question_ids: input.question_ids ?? [],
    use_predefined_set: input.use_predefined_set ?? false,
    branches: [],
    notif_config: {
      new_respondent: { enabled: true, channel: "email" },
      milestone: { enabled: true, every_n: 25 },
      anomaly: { enabled: true },
      expiry: { enabled: false, days_before: 7 },
      daily_summary: { enabled: false },
    },
    anonymize_after_days: 90,
    allow_behavioral_tracking: true,
    expires_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: null,
  };
  db.tests = [t, ...db.tests];
  log({
    action: "test.create",
    target_type: "test",
    target_id: id,
    pii_access: false,
    details: `Test "${t.title}" vytvorený.`,
  });
  emit();
  return t;
};

export const deleteTest = (id: string) => {
  db.tests = db.tests.filter((t) => t.id !== id);
  emit();
};

export const markNotificationRead = (id: string) => {
  db.notifications = db.notifications.map((n) =>
    n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
  );
  emit();
};

export const markAllNotificationsRead = () => {
  db.notifications = db.notifications.map((n) =>
    n.read_at ? n : { ...n, read_at: new Date().toISOString() },
  );
  emit();
};

export const logPiiAccess = (respondentId: string, reason: string) => {
  log({
    action: "respondent.pii_access",
    target_type: "respondent",
    target_id: respondentId,
    pii_access: true,
    details: reason,
  });
  emit();
};

export const createDSR = (
  input: Omit<DSRRequest, "id" | "created_at" | "sla_due_at" | "resolved_at" | "status">,
) => {
  const now = Date.now();
  const dsr: DSRRequest = {
    ...input,
    id: `dsr_${now.toString(36)}`,
    status: "open",
    created_at: new Date(now).toISOString(),
    sla_due_at: new Date(now + 30 * 86400000).toISOString(),
    resolved_at: null,
  };
  db.dsr = [dsr, ...db.dsr];
  log({
    action: "dsr.open",
    target_type: "dsr",
    target_id: dsr.id,
    pii_access: true,
    details: `DSR (${dsr.type}) podaná.`,
  });
  emit();
  return dsr;
};

export const updateDSR = (id: string, status: DSRRequest["status"]) => {
  db.dsr = db.dsr.map((d) =>
    d.id === id
      ? {
          ...d,
          status,
          resolved_at:
            status === "completed" || status === "rejected"
              ? new Date().toISOString()
              : d.resolved_at,
        }
      : d,
  );
  const action =
    status === "completed"
      ? "dsr.complete"
      : status === "rejected"
        ? "dsr.reject"
        : status === "in_progress"
          ? "dsr.pick_up"
          : "dsr.update";
  log({
    action,
    target_type: "dsr",
    target_id: id,
    pii_access: false,
    details: `DSR ${status}.`,
  });
  emit();
};

export const addTeamMember = (teamId: string, email: string, role: TeamMember["role"]) => {
  const tm: TeamMember = {
    id: `tm_${Date.now()}`,
    team_id: teamId,
    user_id: `usr_${Date.now()}`,
    email,
    display_name: email.split("@")[0],
    role,
    joined_at: new Date().toISOString(),
  };
  db.teamMembers = [...db.teamMembers, tm];
  log({
    action: "team.invite",
    target_type: "team",
    target_id: teamId,
    pii_access: false,
    details: `Pozvanie pre ${email} (${role}).`,
  });
  emit();
};

export const removeTeamMember = (id: string) => {
  db.teamMembers = db.teamMembers.filter((m) => m.id !== id);
  emit();
};

export const updateTeamMemberRole = (id: string, role: TeamMember["role"]) => {
  db.teamMembers = db.teamMembers.map((m) => (m.id === id ? { ...m, role } : m));
  emit();
};

export const createSession = (testId: string, intake: Record<string, string>, consent: boolean) => {
  const t = getTest(testId);
  if (!t) throw new Error("Test not found");
  const respId = `rsp_${Date.now()}`;
  db.respondents = [
    ...db.respondents,
    {
      id: respId,
      email: intake.if_email ?? null,
      display_name: intake.if_name ?? null,
      anonymized_at: null,
      created_at: new Date().toISOString(),
    },
  ];
  const s: Session = {
    id: `ses_${Date.now()}`,
    test_id: testId,
    version: t.version,
    respondent_id: respId,
    intake_data: intake,
    consent_given: consent,
    answers: [],
    started_at: new Date().toISOString(),
    finished_at: null,
    score: null,
    status: "in_progress",
    segment: t.segmentation[0] ?? null,
    ip_hash: "h_local",
  };
  db.sessions = [s, ...db.sessions];
  emit();
  return s;
};

export const completeSession = (sessionId: string, answers: Session["answers"]) => {
  const correct = answers.filter((a) => a.is_correct).length;
  const score = answers.length ? Math.round((correct / answers.length) * 100) : 0;
  db.sessions = db.sessions.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          answers,
          status: "completed" as const,
          score,
          finished_at: new Date().toISOString(),
        }
      : s,
  );
  const s = db.sessions.find((x) => x.id === sessionId);
  if (s) {
    const t = getTest(s.test_id);
    if (t) {
      db.notifications = [
        {
          id: `ntf_${Date.now()}`,
          user_id: t.owner_id,
          event_type: "new_respondent",
          test_id: t.id,
          title: "Nový respondent",
          body: `Niekto dokončil test "${t.title}" so skóre ${score}%.`,
          read_at: null,
          created_at: new Date().toISOString(),
        },
        ...db.notifications,
      ];
    }
  }
  emit();
  return score;
};

// ---------- Respondent groups ----------
export const useGroups = makeHook((d) => d.groups);
export const useAssignments = makeHook((d) => d.assignments);

export const getGroup = (id: string) => db.groups.find((g) => g.id === id);
export const assignmentsForTest = (testId: string) =>
  db.assignments.filter((a) => a.test_id === testId);
export const assignmentsForGroup = (groupId: string) =>
  db.assignments.filter((a) => a.group_id === groupId);

const normalizeEmails = (raw: string): string[] => {
  const set = new Set<string>();
  raw
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /.+@.+\..+/.test(e))
    .forEach((e) => set.add(e));
  return Array.from(set);
};

export const createGroup = (input: {
  name: string;
  description?: string;
  tags?: string[];
  emails_raw?: string;
}) => {
  const id = `grp_${Date.now().toString(36)}`;
  const g: RespondentGroup = {
    id,
    name: input.name,
    description: input.description ?? "",
    owner_id: currentUserId(),
    tags: input.tags ?? [],
    member_emails: input.emails_raw ? normalizeEmails(input.emails_raw) : [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.groups = [g, ...db.groups];
  log({
    action: "group.create",
    target_type: "team",
    target_id: id,
    pii_access: false,
    details: `Skupina "${g.name}" vytvorená (${g.member_emails.length} členov).`,
  });
  emit();
  return g;
};

export const updateGroup = (id: string, patch: Partial<RespondentGroup>) => {
  db.groups = db.groups.map((g) =>
    g.id === id ? { ...g, ...patch, updated_at: new Date().toISOString() } : g,
  );
  emit();
};

export const deleteGroup = (id: string) => {
  db.groups = db.groups.filter((g) => g.id !== id);
  db.assignments = db.assignments.filter((a) => a.group_id !== id);
  emit();
};

export const addGroupMembers = (id: string, emails_raw: string) => {
  const incoming = normalizeEmails(emails_raw);
  let added = 0;
  db.groups = db.groups.map((g) => {
    if (g.id !== id) return g;
    const set = new Set(g.member_emails);
    incoming.forEach((e) => {
      if (!set.has(e)) {
        set.add(e);
        added++;
      }
    });
    return { ...g, member_emails: Array.from(set), updated_at: new Date().toISOString() };
  });
  log({
    action: "group.add_members",
    target_type: "team",
    target_id: id,
    pii_access: true,
    details: `Pridaných ${added} členov.`,
  });
  emit();
  return added;
};

export const removeGroupMember = (id: string, email: string) => {
  db.groups = db.groups.map((g) =>
    g.id === id
      ? {
          ...g,
          member_emails: g.member_emails.filter((e) => e !== email),
          updated_at: new Date().toISOString(),
        }
      : g,
  );
  emit();
};

export const assignTestToGroup = (testId: string, groupId: string) => {
  const existing = db.assignments.find((a) => a.test_id === testId && a.group_id === groupId);
  if (existing) return existing;
  const g = getGroup(groupId);
  const t = getTest(testId);
  if (!g || !t) return null;
  const a: GroupAssignment = {
    id: `ga_${Date.now().toString(36)}`,
    test_id: testId,
    group_id: groupId,
    assigned_by: currentUserId(),
    assigned_at: new Date().toISOString(),
    invited_count: g.member_emails.length,
  };
  db.assignments = [a, ...db.assignments];
  db.notifications = [
    {
      id: `ntf_${Date.now()}`,
      user_id: currentUserId(),
      event_type: "new_respondent",
      test_id: testId,
      title: "Skupina priradená",
      body: `Test "${t.title}" priradený skupine "${g.name}" — pozvánok: ${g.member_emails.length}.`,
      read_at: null,
      created_at: new Date().toISOString(),
    },
    ...db.notifications,
  ];
  log({
    action: "test.assign_group",
    target_type: "test",
    target_id: testId,
    pii_access: false,
    details: `Priradené skupine "${g.name}" (${g.member_emails.length} pozvánok).`,
  });
  emit();
  return a;
};

export const unassignTestFromGroup = (assignmentId: string) => {
  db.assignments = db.assignments.filter((a) => a.id !== assignmentId);
  emit();
};
