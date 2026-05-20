# E38 — Retention crons + auto-anonymisation (free-tier-compatible)

**Owner:** Claude — drives the follow-up on E35.1 matrix rows P-4 / P-6 / P-7 / P-20
**Date opened:** 2026-05-20
**Status:** 🟡 Planned — branch `feature/E38-retention-crons` ready

## TL;DR

The E35.1 compliance matrix flagged four interlocking gaps:

| Matrix ID | Claim on `/privacy` | Actual state |
|---|---|---|
| P-4 | "36-month attempts retention via pg_cron at 03:17 UTC" | Function `purge_expired_attempts()` exists. The `cron.schedule(...)` registration is gated by `IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')`. **pg_cron is NOT available on Supabase Free tier — confirmed by operator** → cron never registered. |
| P-6 | "Anti-cheat logs 12-month retention (Art. 6(1)(f))" | Anti-cheat data lives inline in `attempts.flags` (JSONB). No purge / anonymisation function exists. |
| P-7 | "Edu mode 12-month auto-anonymisation of name + email" | `attempts.respondent_name` + `attempts.respondent_email` exist (edu opt-in). No anonymisation function exists. |
| P-20 | "Daily pg_cron purge at 03:17 UTC" | Tied to P-4 — same root cause. |

This epic closes all four by **replacing pg_cron with GitHub Actions
scheduled workflow** (free, already in active use for CodeQL / npm-audit /
ZAP) and adding the two missing anonymisation functions.

## Scope

### In
- Two new SQL functions:
  - `anonymize_expired_anticheat()` — null/empty `flags` + `total_time_ms` on attempts older than 12 months. Score / percentile / breakdown stay.
  - `anonymize_expired_edu_respondents()` — null `respondent_name` + `respondent_email` on attempts where they were set 12+ months ago. Score / answers stay (author still has anonymised stats).
- GitHub Actions cron workflow `.github/workflows/retention-cron.yml`
  that runs daily at 03:00 UTC and calls all three RPCs (attempts purge,
  anti-cheat anonymise, edu anonymise) via `@supabase/supabase-js` with the
  service-role key.
- Integration tests proving each function actually modifies the right
  rows (Vitest `tests/integration/security/retention.test.ts`).
- Operator runbook update + `DEPLOY_SETUP.sql` to mirror new migrations.
- Update E35.1 matrix rows: ⚠️/❌ → ✅.

### Out — explicitly NOT done in this epic
- Migrating from Supabase Free to Pro (would unblock pg_cron natively
  but costs $25/mo; user chose free-tier path).
- Refactoring `flags` JSONB into a separate table (anti-cheat detail).
  Keeps schema stable; anonymisation works via JSONB null.
- Touching the existing `purge_expired_attempts()` SQL function — it's
  correct; we just need to invoke it from outside pg_cron.
- Sponsorship 10-year retention (no purge needed; "do nothing for 10
  years" doesn't require a cron).
- `audit_log` indefinite retention — same as sponsorship; no purge.

## Decisions

| ID | Decision | Locked |
|---|---|---|
| D1 | Scheduler | **GitHub Actions scheduled workflow.** Free, already in use, integrated logs. Alternative options (CF Workers Cron, pg_cron, external cron-job.org) considered + rejected. |
| D2 | Retention model | **Strictly enforce ALL declared retentions.** Anti-cheat + edu auto-anonymisation both ship in this epic. |
| D3 | Anti-cheat data shape | **NULL the JSONB `flags` + zero `total_time_ms` in place.** No schema change, no separate table. Score / breakdown / personality stay (those are aggregate non-PII). |
| D4 | Edu anonymisation shape | **NULL `respondent_name` + `respondent_email` in place.** Score + answers stay so the author dashboard keeps working post-anonymisation. |
| D5 | Cron cadence | **Daily 03:00 UTC**, single workflow invoking 3 RPCs sequentially. Matches existing `/privacy` claim wording ("daily"). |
| D6 | Operator deployment story | **User runs the new migrations manually post-merge** (CLAUDE.md rule). GitHub secret `SUPABASE_SERVICE_ROLE_KEY` must already be present (already used by E35.7 CI jobs). |
| D7 | `/privacy` copy update | **Update s5 retention section** to say "daily retention job at 03:00 UTC" (was 03:17 UTC for pg_cron). Minor copy edit; no `CONSENT_VERSION` bump needed because the data model and processors are unchanged. |

## Story map

| ID | Title | Effort | Priority | Status |
|---|---|---|---|---|
| [E38.1](./stories/E38.1-anticheat-anonymise.md) | Anti-cheat anonymisation function (NULL `flags` at 12 months) | `S` | `P1` | 🟡 Ready |
| [E38.2](./stories/E38.2-edu-anonymise.md) | Edu auto-anonymisation function (NULL respondent name + email at 12 months) | `S` | `P1` | 🟡 Ready |
| [E38.3](./stories/E38.3-retention-cron-workflow.md) | GitHub Actions retention-cron workflow | `M` | `P1` | 🟡 Ready |
| [E38.4](./stories/E38.4-retention-integration-tests.md) | Live-SQL integration tests for all 3 RPCs | `M` | `P2` | 🟡 Ready |
| [E38.5](./stories/E38.5-deploy-setup-update.md) | DEPLOY_SETUP.sql + runbook update | `XS` | `P2` | 🟡 Ready |
| [E38.6](./stories/E38.6-privacy-copy-matrix.md) | `/privacy` s5 copy + flip E35.1 matrix rows to ✅ | `XS` | `P2` | 🟡 Ready |

## Discovery — current state (from E35 + this session)

**Existing infrastructure:**
- `purge_expired_attempts()` SQL function — defined in
  `supabase/migrations/20260426110000_self_service_delete_and_retention.sql`,
  works correctly when called.
- `purge_unused_test_sets()` — defined in
  `supabase/migrations/20260428000000_test_sets.sql:166-180`. Also
  conditional on pg_cron.
- GitHub Actions infra — 4 scheduled workflows already in use (CI,
  CodeQL, npm-audit, ZAP). Pattern established for `schedule: cron:`.

**Schema realities (not the matrix's earlier assumption):**
- Anti-cheat data ≠ separate table; lives inline in `attempts.flags JSONB`.
  Therefore anonymisation = JSONB null, not table drop.
- Edu PII ≠ separate `respondents` table; lives inline in
  `attempts.respondent_name` + `attempts.respondent_email` columns
  (added by `20260501000000_edu_mode.sql`). Therefore anonymisation =
  column null, not row delete (preserves score / answers / breakdown).

**Authentication for the cron:**
- The GitHub Actions runner authenticates to Supabase via
  `SUPABASE_SERVICE_ROLE_KEY` repository secret. This secret already
  exists for CI integration tests (E35.7 path).
- RPC functions are `SECURITY DEFINER` and explicitly grant EXECUTE to
  `service_role`, mirroring the existing `purge_expired_attempts` pattern.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| GitHub Actions cron can be delayed up to 30 min during peak load (documented behaviour). | Acceptable — retention runs daily, exact minute doesn't matter. Document in runbook. |
| Service-role key in repo secret gets leaked | Rotate immediately if leaked; workflow uses minimal scope (calls RPC, doesn't expose key in logs). Job sets `permissions: contents: read` only. |
| Anonymising `flags` JSONB breaks downstream analytics if any reads it after 12 months | None visible today — flags is consumed at attempt-submission time only. Add a query log search as a Definition-of-Done check before flipping the cron on. |
| Edu author dashboard fails when respondent_name becomes NULL post-anonymisation | E38.2 includes a test that runs the dashboard query against anonymised rows — it must render "Anonymný respondent" or similar fallback. UI work, not just SQL. |
| Cron runs on a forked PR by accident | `schedule:` events never fire from forks (GitHub design). Safe. |

## Verification & DoD

For the epic as a whole (per `tasks/DEFINITION_OF_DONE.md` § 3):

1. `npm run lint` → 0/0
2. `npm test` → all green (no regressions in 1430-test baseline)
3. `npm run test:integration` against local Supabase → new tests green
4. `npm run build` → ✓
5. Manual on-staging dry-run: invoke each RPC against a fresh Supabase
   instance with seeded 13-month-old rows; confirm rows transitioned
   to anonymised state.
6. CHANGELOG entry (one line per shipped retention surface).
7. `/privacy` s5 copy edit + `/zmeny` rendered correctly.
8. Fresh-context code review on the diff.

## Execution order

1. **E38.1** + **E38.2** (parallel) — write the two SQL functions.
2. **E38.3** — write the GH Actions workflow that calls all three RPCs.
3. **E38.4** — write integration tests against local Supabase.
4. **E38.5** — sync `DEPLOY_SETUP.sql` + runbook.
5. **E38.6** — `/privacy` copy + matrix flip in the same change.
6. Run full verification block.
7. Open PR.
