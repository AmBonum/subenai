# Authed-surface negative paths (/app teams, templates, account; /admin users)

Source: 2026-06-12 negative-coverage audit. Goal: failure paths of authed
mutations are exercised at the UI level with the user-visible reaction
asserted verbatim.

Environment: vite :8080 (`--project=e2e-chromium`), educator/admin sessions
via `setupEducator` / `setupAdmin` from e2e/setup/app-shell.ts. Supabase
REST/RPC failures via the mockSupabase `errors` config (per-table/per-RPC);
`/api/*` failures via `page.route` (last-registered route wins = retry
mechanism). Locators POM-only; missing data-testids are added to the source
component in the same change.

Bug-hunting contract (same as public-negative-paths.md): read the component
first; if a failure path renders NOTHING user-visible, flag it as an app
bug (file:line) in your final report; when the fix is a one-liner matching
existing patterns (inline role=alert like `resp-table-delete-error`, or a
toast message wrapped in a testid span like `toast-export-csv-error`),
apply it and test the new behavior.

---

## A. Teams (/app/teams)

Source: src/routes/app.teams.tsx (mutations show `toast.error(err.message)`).
Existing spec: e2e/specs/app/teams.spec.ts — reuse its seed/POM.

**AA-01 — create-team failure surfaces a toast and keeps the dialog open.**
Open the create flow, fail the `teams` insert via mockSupabase errors
(e.g. `{ status: 500, message: "insert failed" }`) → assert the toast
appears (wrap the message in a testid span if it lacks one) and the entered
team name is not lost. Re-register success → retry → team appears.

**AA-02 — invite/member mutation failure surfaces a toast, member list unchanged.**
Fail the `team_members` mutation → assert toast + the list still shows the
original members.

## B. Templates (/app/templates)

Source: src/components/app/templates/TemplateDuplicateDialog.tsx (onError
~line 54) + TemplateDeleteConfirm.tsx (onError ~line 41) — read both for
the exact error rendering. Existing spec: e2e/specs/app/templates.spec.ts.

**AA-03 — duplicate failure shows the dialog error, dialog stays open, retry succeeds.**
Seed a public template, open duplicate dialog, fail the underlying call
(read useDuplicateTemplate in src/lib/platform/queries.ts — RPC or table?)
via mockSupabase errors → assert error rendering verbatim. Restore →
retry → success path (navigates or closes — assert it).

**AA-04 — delete failure keeps the template in the list and shows the error.**
Fail the delete → assert error + row still present. Restore → delete →
row gone.

## C. Account (/app/account — DSR/data export)

Source: src/components/user/DsrSubmitForm.tsx as embedded in the account
surface (AccountTabs) + src/components/user/DataExportCard.tsx.

**AA-05 — data export failure shows the error state; retry recovers.**
Read DataExportCard for its fetch target (`/api/account/export-data`?) and
error rendering. Stub → 500 → assert copy; re-stub → 200 with a minimal
valid body → retry → success rendering (don't assert the actual file
download contents, just the UI state).

## D. Admin users (/admin/users/<id> dossier — role + ban via PATCH /api/admin/users/:id)

Source: src/components/admin/UserDossier.tsx (find where
useUpdateUserRole/useToggleUserBanned from src/lib/admin/queries.ts are
invoked and how onError renders — the hooks throw the server `error` string
verbatim, e.g. "not_admin", "aal2_required", "ban_update_failed").
Existing spec: e2e/specs/admin/dossier-flow.spec.ts — reuse its setup.

**AA-06 — role change PATCH 403 (aal2_required) surfaces the error to the admin.**
Open a user dossier (setupAdmin + seeded profile), stub
`PATCH **/api/admin/users/*` → 403 `{"error":"aal2_required"}` → trigger a
role change → assert the user-visible error (toast/alert; testid it if
needed) and that the displayed role did NOT change.

**AA-07 — ban toggle PATCH 500 (ban_update_failed) surfaces the error and the ban state stays.**
Stub → 500 `{"error":"ban_update_failed"}` → toggle ban → assert error +
state unchanged. Re-stub → 200 `{"ok":true,"user_id":"<id>","banned":true}`
→ retry → state flips.

## E. Onboarding (/app first run)

Source: find the onboarding submit (profile_preferences upsert?) — grep
`onboarded_at` writers under src/. Existing spec: e2e/specs/app/onboarding.spec.ts.

**AA-08 — onboarding save failure shows an error and does NOT advance to /app.**
Run the onboarding flow with the `profile_preferences` mutation failing via
mockSupabase errors → assert the user sees an error (or flag silent failure
as a bug) and stays on the onboarding step. Restore → retry → lands in /app.

---

Definition of done: spec at `e2e/specs/cross-cutting/app-admin-negative-paths.spec.ts`,
POMs extended (no raw locators in spec body), every TC green against vite
:8080, eslint 0/0 on touched files. Final report lists silent-failure bugs
found (file:line + user impact).
