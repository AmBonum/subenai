// Pre-seed every user (`["user", ...]`) TanStack Query key with the same UI
// shape `@/lib/platform/seed` (SEED_*) provides. AH-11.2b swaps every /app/*
// read onto `useX()` hooks from `src/lib/platform/queries.ts`; tests assert
// on rendered rows immediately after `render(<Page />)`, so the cache must
// be populated before the first paint.

import type { QueryClient } from "@tanstack/react-query";
import {
  SEED_DSR,
  SEED_GROUPS,
  SEED_NOTIFICATIONS,
  SEED_RESPONDENTS,
  SEED_SESSIONS,
  SEED_TEAMS,
  SEED_TEAM_MEMBERS,
  SEED_TEMPLATES,
  SEED_TEST_VERSIONS,
  SEED_TESTS,
  SEED_USERS,
  CURRENT_USER_ID,
} from "@/lib/platform/seed";
import type {
  Audience,
  HistoryItem,
  Notification,
  Profile,
  Respondent,
  Session,
  Team,
  TeamMember,
  Template,
  Test,
  TestVersion,
} from "@/lib/platform/types";

export function seedUserQueryClient(qc: QueryClient): void {
  const me = SEED_USERS.find((u) => u.id === CURRENT_USER_ID) ?? SEED_USERS[0];
  const profile: Profile = {
    id: me.id,
    email: me.email,
    display_name: me.display_name,
    avatar_initials: me.avatar_initials,
    created_at: new Date(0).toISOString(),
  };
  qc.setQueryData(["user", "profile"], profile);

  const tests: Test[] = SEED_TESTS;
  qc.setQueryData(["user", "tests"], tests);
  for (const t of tests) qc.setQueryData(["user", "tests", t.id], t);

  const sessions: Session[] = SEED_SESSIONS;
  qc.setQueryData(["user", "sessions"], sessions);

  // Dashboard KPI aggregates — mirrors the useDashboardStats() shape so
  // /app dashboard renders stat cards synchronously.
  const since7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentSessionsByTest: Record<string, number> = {};
  for (const s of sessions) {
    if (new Date(s.started_at).getTime() >= since7d) {
      recentSessionsByTest[s.test_id] = (recentSessionsByTest[s.test_id] ?? 0) + 1;
    }
  }
  qc.setQueryData(["user", "dashboard-stats"], {
    sessionsTotal: sessions.length,
    sessionsCompleted: sessions.filter((s) => s.status === "completed").length,
    completedSinceMonday: 0,
    recentSessionsByTest,
    respondentsTotal: SEED_RESPONDENTS.length,
  });

  const audiences: Audience[] = SEED_GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    owner_id: g.owner_id,
    member_emails: g.member_emails,
    tags: g.tags,
    created_at: g.created_at,
    updated_at: g.updated_at,
  }));
  qc.setQueryData(["user", "audiences"], audiences);

  const templates: Template[] = SEED_TEMPLATES;
  qc.setQueryData(["user", "templates"], templates);

  const notifications: Notification[] = SEED_NOTIFICATIONS;
  qc.setQueryData(["user", "notifications"], notifications);

  const teams: Team[] = SEED_TEAMS;
  qc.setQueryData(["user", "teams"], teams);
  for (const t of teams) {
    const members = SEED_TEAM_MEMBERS.filter((m) => m.team_id === t.id);
    qc.setQueryData(["user", "teams", t.id], { team: t, members });
  }

  // History — join sessions with their test titles (mirrors useHistory mapper).
  const titleMap = new Map(tests.map((t) => [t.id, t.title]));
  const history: HistoryItem[] = sessions.map((s) => ({
    id: s.id,
    test_id: s.test_id,
    test_title: titleMap.get(s.test_id) ?? "",
    score: s.score,
    finished_at: s.finished_at,
    status: s.status === "completed" ? "completed" : "in_progress",
  }));
  qc.setQueryData(["user", "history", 50], history);

  // DSR list (AH-11.2c) — `useUserDSRList()` now reads dsr_requests through
  // RLS-filtered Supabase; pre-seeding keeps the first render synchronous.
  qc.setQueryData(["user", "dsr"], SEED_DSR);

  // Respondents (AH-11.2c) — backs the /app dashboard count card.
  const respondents: Respondent[] = SEED_RESPONDENTS;
  qc.setQueryData(["user", "respondents"], respondents);

  // Test versions (AH-11.2c) — backs /app/history version events.
  const versions: TestVersion[] = SEED_TEST_VERSIONS;
  qc.setQueryData(["user", "test_versions", "all"], versions);
  for (const t of tests) {
    qc.setQueryData(
      ["user", "test_versions", t.id],
      versions.filter((v) => v.test_id === t.id),
    );
  }

  // Team members (AH-11.2c) — flat list /app/teams iterates.
  const teamMembers: TeamMember[] = SEED_TEAM_MEMBERS;
  qc.setQueryData(["user", "team_members"], teamMembers);
}
