# FEATURE MAP — admin-hub Integration

This file is the source of truth for where every admin-hub artifact lives in subenai.
The agent implementing a story MUST update the status column + commit SHA in the same
commit that closes the story. Story IDs follow the `AH-{epic}.{story}` scheme defined
in `tasks/PLAN-2026-05-17-admin-hub-integration.md`. Status values:
- `Backlog` — not started
- `In Progress` — story is open, partial commits landing
- `Pilot` — ported as workflow pilot ahead of its epic; full story DoD (tests,
  i18n extraction, AC verification) still pending in the owning epic
- `Done` — story merged, all four DoD subtasks satisfied

---

## Table 1 — Routes

| admin-hub source | proposed subenai path | epic.story | Status | Commit SHA |
|---|---|---|---|---|
| `routes/__root.tsx` | extend `src/routes/__root.tsx` (not replaced) | AH-3.1 | Done | see `git log` |
| `routes/app.tsx` | `src/routes/app.tsx` | AH-3.1 | Done | see `git log` |
| `routes/app.index.tsx` | `src/routes/app.index.tsx` | AH-3.2 | Done | see `git log` |
| `routes/app.tests.index.tsx` | `src/routes/app.tests.index.tsx` | AH-5.1 | Done | see `git log` |
| `routes/app.tests.new.tsx` | `src/routes/app.tests.new.tsx` | AH-5.2 | Done | see `git log` |
| `routes/app.tests.$testId.tsx` | `src/routes/app.tests.$testId.tsx` | AH-5.3 | Done | see `git log` |
| `routes/app.sets.$setId.tsx` | `src/routes/app.sets.$setId.tsx` | AH-4.3 | Done | see `git log` |
| `routes/app.audiences.tsx` | `src/routes/app.audiences.tsx` | AH-5.4 | Done | see `git log` |
| `routes/app.teams.tsx` | `src/routes/app.teams.tsx` | AH-3.3 | Done | see `git log` |
| `routes/app.library.tsx` | `src/routes/app.library.tsx` | AH-4.2 | Done | see `git log` |
| `routes/app.templates.tsx` | `src/routes/app.templates.tsx` | AH-5.5 | Done | see `git log` |
| `routes/app.history.tsx` | `src/routes/app.history.tsx` | AH-5.6 | Done | see `git log` |
| `routes/app.notifications.tsx` | `src/routes/app.notifications.tsx` | AH-3.4 | Done | see `git log` |
| `routes/app.help.tsx` | `src/routes/app.help.tsx` | AH-3.5 | Done | see `git log` |
| `routes/app.account.profile.tsx` | `src/routes/app.account.profile.tsx` | AH-3.6 | Done | see `git log` |
| `routes/app.account.security.tsx` | `src/routes/app.account.security.tsx` | AH-3.7 | Done | see `git log` |
| `routes/app.legal.dsr.tsx` | `src/routes/app.legal.dsr.tsx` | AH-7.1 | Done | see `git log` |
| `routes/admin.tsx` | `src/routes/admin.tsx` | AH-10.1 | Done | see `git log` |
| `routes/admin/index.tsx` | `src/routes/admin/index.tsx` | AH-10.2 | Done | see `git log` |
| `routes/admin/users.tsx` | `src/routes/admin/users.tsx` | AH-10.3 | Done | see `git log` |
| `routes/admin/questions.tsx` | `src/routes/admin/questions.tsx` | AH-4.1 | Done | see `git log` |
| `routes/admin/answer-sets.tsx` | `src/routes/admin/answer-sets.tsx` | AH-4.4 | Done | see `git log` |
| `routes/admin/answer-sets.$setId.tsx` | `src/routes/admin/answer-sets.$setId.tsx` | AH-4.5 | Done | see `git log` |
| `routes/admin/tests.tsx` | `src/routes/admin/tests.tsx` | AH-5.7 | Backlog | |
| `routes/admin/tests.$testId.tsx` | `src/routes/admin/tests.$testId.tsx` | AH-5.8 | Backlog | |
| `routes/admin/trainings.tsx` | `src/routes/admin/trainings.tsx` | AH-6.1 | Done | see `git log` |
| `routes/admin/categories.tsx` | `src/routes/admin/categories.tsx` | AH-6.2 | Done | see `git log` |
| `routes/admin/reports.tsx` | `src/routes/admin/reports.tsx` | AH-7.2 | Done | see `git log` |
| `routes/admin/respondents.tsx` | `src/routes/admin/respondents.tsx` | AH-7.3 | Done | see `git log` |
| `routes/admin/audit.tsx` | `src/routes/admin/audit.tsx` | AH-7.4 | Done | see `git log` |
| `routes/admin/dsr.tsx` | `src/routes/admin/dsr.tsx` | AH-7.5 | Done | see `git log` |
| `routes/admin/quick-test.tsx` | `src/routes/admin/quick-test.tsx` | AH-9.5 | Backlog | |
| `routes/admin/share-card.tsx` | `src/routes/admin/share-card.tsx` | AH-9.6 | Backlog | |
| `routes/admin/pages.tsx` | `src/routes/admin/pages.tsx` | AH-9.1 | Backlog | |
| `routes/admin/pages.$pageId.tsx` | `src/routes/admin/pages.$pageId.tsx` | AH-9.2 | Backlog | |
| `routes/admin/header.tsx` | `src/routes/admin/header.tsx` | AH-9.3 | Backlog | |
| `routes/admin/footer.tsx` | `src/routes/admin/footer.tsx` | AH-9.3 | Backlog | |
| `routes/admin/navigation.tsx` | `src/routes/admin/navigation.tsx` | AH-9.4 | Backlog | |
| `routes/admin/support.tsx` | `src/routes/admin/support.tsx` | AH-10.4 | Done | see `git log` |
| `routes/admin/settings.tsx` | `src/routes/admin/settings.tsx` | AH-10.5 | Done | see `git log` |
| `routes/t.$shareId.tsx` | `src/routes/t.$shareId.tsx` | AH-8.1 | Done | see `git log` |
| `routes/s.$slug.tsx` | `src/routes/s.$slug.tsx` | AH-9.7 | Backlog | |
| `routes/login.tsx` | NOT PORTED — reuse Supabase Auth | — | N/A | |
| `routes/register.tsx` | NOT PORTED — reuse Supabase Auth | — | N/A | |
| `routes/forgot-password.tsx` | NOT PORTED — reuse Supabase Auth | — | N/A | |
| `routes/reset-password.tsx` | NOT PORTED — reuse Supabase Auth | — | N/A | |
| `routes/admin-login.tsx` | NOT PORTED — role gate via `has_role()` | — | N/A | |
| `routes/docs.tsx` | NOT PORTED — deferred static content | — | N/A | |
| `routes/index.tsx` | NOT PORTED — subenai landing stays | — | N/A | |

---

## Table 2 — Components

| admin-hub source | proposed subenai path | epic.story | Status | Commit SHA |
|---|---|---|---|---|
| `components/admin/AdminSidebar.tsx` | `src/components/admin/AdminSidebar.tsx` | AH-10.1 | Done | see `git log` |
| `components/admin/AiQuestionGenerator.tsx` | `src/components/admin/AiQuestionGenerator.tsx` (feature-flagged off) | AH-4.1 | Done | see `git log` |
| `components/admin/AnswerSetEditor.tsx` | `src/components/admin/AnswerSetEditor.tsx` | AH-4.5 | Backlog | |
| `components/admin/CategoryMultiSelect.tsx` | `src/components/admin/CategoryMultiSelect.tsx` | AH-6.2 | Done | see `git log` |
| `components/admin/ConfirmDialog.tsx` | `src/components/admin/ConfirmDialog.tsx` | AH-3.1 | Done | see `git log` |
| `components/admin/PageHeader.tsx` | `src/components/admin/PageHeader.tsx` | AH-10.2 | Done | see `git log` |
| `components/admin/QuestionEditor.tsx` | `src/components/admin/QuestionEditor.tsx` | AH-4.1 | Done | see `git log` |
| `components/admin/StatCard.tsx` | `src/components/admin/StatCard.tsx` | AH-3.2 | Done | see `git log` |
| `components/admin/StatusBadge.tsx` | `src/components/admin/StatusBadge.tsx` | AH-4.1 | Done | see `git log` |
| `components/admin/TestEditor.tsx` | `src/components/admin/TestEditor.tsx` | AH-5.8 | Backlog | |
| `components/admin/TrainingEditor.tsx` | `src/components/admin/TrainingEditor.tsx` | AH-6.1 | Done | see `git log` |
| `components/app/page-header.tsx` | `src/components/app/page-header.tsx` | AH-3.1 | Done | see `git log` |
| `components/auth/AuthShell.tsx` | NOT PORTED — replaced by `requireSupabaseAuth` middleware | — | N/A | |
| `components/user/AppShell.tsx` | `src/components/user/AppShell.tsx` | AH-3.1 | Done | see `git log` |
| `components/user/ShareDialog.tsx` | `src/components/user/ShareDialog.tsx` | AH-5.3 | Done | see `git log` |
| `lib/platform/types.ts` | `src/lib/platform/types.ts` | AH-1.1 | Done | see `git log` |
| `lib/admin/store.ts` | `src/lib/admin/mock-store.ts` (deleted in AH-11) | AH-3.1 | Done | see `git log` |
| `lib/platform/store.ts` | `src/lib/platform/mock-store.ts` (deleted in AH-11) | AH-3.1 | Done | see `git log` |
| `lib/admin-mock-data.ts` | `src/lib/admin/mock-data.ts` (deleted in AH-11) | AH-3.1 | Done | see `git log` |
| `lib/user-mock-data.ts` | `src/lib/platform/mock-user-data.ts` (deleted in AH-11) | AH-3.1 | Done | see `git log` |
| `lib/admin/answer-sets-store.ts` | `src/lib/admin/answer-sets-mock-store.ts` (deleted in AH-11) | AH-4.4 | Done | see `git log` |
| `lib/admin/cms-store.ts` | `src/lib/admin/cms-mock-store.ts` (deleted in AH-11) | AH-9.1 | Backlog | |
| `lib/admin/cms-hooks.ts` | `src/lib/admin/cms-hooks.ts` (wired in AH-11) | AH-9.1 | Backlog | |
| `lib/admin/export.ts` | `src/lib/admin/export.ts` (deferred — not wired) | AH-11 | Backlog | |
| `lib/platform/exports.ts` | `src/lib/platform/exports.ts` (deferred — not wired) | AH-11 | Backlog | |
| `lib/admin/support-config.ts` | `src/lib/admin/support-config.ts` | AH-10.4 | Done | see `git log` |
| `lib/ai-generate.functions.ts` | `src/lib/admin/ai-generate.functions.ts` (feature-flagged off) | AH-4.1 | Done | see `git log` |
| `lib/utils.ts` | identical to existing `src/lib/utils.ts` (no merge needed) | AH-2.1 | Done | see `git log` |

---

## Table 3 — DB Objects

| Table or function | proposed migration filename | epic.story | Status | Commit SHA |
|---|---|---|---|---|
| enum `app_role` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| enum `test_status` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| enum `question_type` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| enum `question_status` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| enum `gdpr_purpose` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| enum `session_status` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| enum `training_status` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| enum `report_reason` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| enum `report_status` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| enum `team_role` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| enum `dsr_type` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| enum `dsr_status` | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| function `has_role(uuid, app_role)` SECURITY DEFINER | `20260517000000_admin_hub_schema.sql` | AH-1.1 | Done | see `git log` |
| function `handle_new_user()` + trigger `on_auth_user_created` | `20260517000000_admin_hub_schema.sql` | AH-1.2 | Done | see `git log` |
| trigger `forbid_session_score_changes` on `sessions` | `20260517000000_admin_hub_schema.sql` | AH-1.4 | Done | see `git log` |
| table `profiles` | `20260517000000_admin_hub_schema.sql` | AH-1.2 | Done | see `git log` |
| table `user_roles` | `20260517000000_admin_hub_schema.sql` | AH-1.2 | Done | see `git log` |
| table `teams` | `20260517000000_admin_hub_schema.sql` | AH-1.2 | Done | see `git log` |
| table `team_members` | `20260517000000_admin_hub_schema.sql` | AH-1.2 | Done | see `git log` |
| table `categories` | `20260517000000_admin_hub_schema.sql` | AH-1.3 | Done | see `git log` |
| table `topics` | `20260517000000_admin_hub_schema.sql` | AH-1.3 | Done | see `git log` |
| table `answer_sets` | `20260517000000_admin_hub_schema.sql` | AH-1.3 | Done | see `git log` |
| table `answers` | `20260517000000_admin_hub_schema.sql` | AH-1.3 | Done | see `git log` |
| table `questions` | `20260517000000_admin_hub_schema.sql` | AH-1.3 | Done | see `git log` |
| table `templates` | `20260517000000_admin_hub_schema.sql` | AH-1.3 | Done | see `git log` |
| table `trainings` | `20260517000000_admin_hub_schema.sql` | AH-1.3 | Done | see `git log` |
| table `tests` | `20260517000000_admin_hub_schema.sql` | AH-1.4 | Done | see `git log` |
| table `test_questions` | `20260517000000_admin_hub_schema.sql` | AH-1.4 | Done | see `git log` |
| table `test_versions` | `20260517000000_admin_hub_schema.sql` | AH-1.4 | Done | see `git log` |
| table `respondents` | `20260517000000_admin_hub_schema.sql` | AH-1.4 | Done | see `git log` |
| table `sessions` | `20260517000000_admin_hub_schema.sql` | AH-1.4 | Done | see `git log` |
| table `session_answers` | `20260517000000_admin_hub_schema.sql` | AH-1.4 | Done | see `git log` |
| table `behavioral_events` | `20260517000000_admin_hub_schema.sql` | AH-1.4 | Done | see `git log` |
| table `respondent_groups` | `20260517000000_admin_hub_schema.sql` | AH-1.4 | Done | see `git log` |
| table `group_assignments` | `20260517000000_admin_hub_schema.sql` | AH-1.4 | Done | see `git log` |
| table `notifications` | `20260517000000_admin_hub_schema.sql` | AH-1.5 | Done | see `git log` |
| table `audit_log` | `20260517000000_admin_hub_schema.sql` | AH-1.5 | Done | see `git log` |
| table `dsr_requests` | `20260517000000_admin_hub_schema.sql` | AH-1.5 | Done | see `git log` |
| table `reports` | `20260517000000_admin_hub_schema.sql` | AH-1.5 | Done | see `git log` |
| table `cms_pages` | `20260517000000_admin_hub_schema.sql` | AH-1.6 | Done | see `git log` |
| table `cms_header` | `20260517000000_admin_hub_schema.sql` | AH-1.6 | Done | see `git log` |
| table `cms_footer` | `20260517000000_admin_hub_schema.sql` | AH-1.6 | Done | see `git log` |
| table `cms_navigation` | `20260517000000_admin_hub_schema.sql` | AH-1.6 | Done | see `git log` |
| table `share_card_config` | `20260517000000_admin_hub_schema.sql` | AH-1.6 | Done | see `git log` |
| table `quick_test_config` | `20260517000000_admin_hub_schema.sql` | AH-1.6 | Done | see `git log` |
| table `support_config` | `20260517000000_admin_hub_schema.sql` | AH-1.6 | Done | see `git log` |
| table `app_settings` | `20260517000000_admin_hub_schema.sql` | AH-1.6 | Done | see `git log` |
| cron `anonymize-sessions` (pg_cron, commented stub) | `20260517000000_admin_hub_schema.sql` | AH-1.8 | Done | see `git log` |
| cron `dsr-sla-check` (pg_cron, commented stub) | `20260517000000_admin_hub_schema.sql` | AH-1.8 | Done | see `git log` |
