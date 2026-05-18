// Pre-seed every user (`["user", ...]`) TanStack Query key with the same UI
// shape `mock-user-data` (SEED_*) provides. AH-11.2b swaps every /app/* read
// onto `useX()` hooks from `src/lib/platform/queries.ts`; tests assert on
// rendered rows immediately after `render(<Page />)`, so the cache must be
// populated before the first paint.

import type { QueryClient } from "@tanstack/react-query";
import {
  SEED_DSR,
  SEED_GROUPS,
  SEED_NOTIFICATIONS,
  SEED_SESSIONS,
  SEED_TEAMS,
  SEED_TEAM_MEMBERS,
  SEED_TEMPLATES,
  SEED_TESTS,
  SEED_USERS,
  CURRENT_USER_ID,
} from "@/lib/platform/seed";
import type {
  Audience,
  HistoryItem,
  Notification,
  Profile,
  Session,
  Team,
  Template,
  Test,
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

  // DSR list — queries.ts ships only `useSubmitDSR` mutation; the read stays on
  // mock-store. We pre-seed the key anyway so a future `useUserDSR()` lands
  // without changing the seed shape.
  qc.setQueryData(["user", "dsr"], SEED_DSR);
}
