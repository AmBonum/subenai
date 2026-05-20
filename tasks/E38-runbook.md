# E38 — Retention crons operational runbook

**Epic:** [PLAN-2026-05-20-E38](./PLAN-2026-05-20-E38-retention-crons.md)
**Last updated:** 2026-05-20

## What ships

Two new SQL functions (one migration each) + one GitHub Actions
scheduled workflow + one Node script that ties them together.

| Artefact | Path | Purpose |
|---|---|---|
| Migration | `supabase/migrations/20260521120000_anticheat_anonymise.sql` | `anonymize_expired_anticheat()` — NULL flags + total_time_ms on attempts > 12 mo |
| Migration | `supabase/migrations/20260521130000_edu_anonymise.sql` | `anonymize_expired_edu_respondents()` — NULL respondent_name + respondent_email on attempts > 12 mo |
| Existing function (not modified) | `purge_expired_attempts()` from `20260426110000_*` | DELETE attempts > 36 mo |
| Cron runner | `scripts/run-retention.mjs` | Calls all three RPCs sequentially with `SUPABASE_SERVICE_ROLE_KEY` |
| Workflow | `.github/workflows/retention-cron.yml` | Daily 03:00 UTC schedule + `workflow_dispatch` for manual runs |

## What the operator needs to do post-merge

### Step 1 — Apply the two new migrations to production Supabase

Per CLAUDE.md non-negotiable: migrations run on prod only after PR
merge, manually via Supabase SQL editor or `supabase db push`.

```bash
# Option A — via Supabase SQL editor (recommended for hand verification)
# 1. Open https://supabase.com/dashboard/project/<project>/sql/new
# 2. Paste contents of supabase/migrations/20260521120000_anticheat_anonymise.sql
# 3. Run, verify "Success. No rows returned"
# 4. Repeat for supabase/migrations/20260521130000_edu_anonymise.sql

# Option B — via CLI
supabase db push --linked
```

### Step 2 — Verify the functions are callable

In the SQL editor:

```sql
-- Should return 0 (no rows currently >12 mo in dev, or some number in prod)
SELECT public.anonymize_expired_anticheat();
SELECT public.anonymize_expired_edu_respondents();
```

Both should succeed without error. If you get
`permission denied for function`, the GRANT didn't apply — re-run the
GRANT lines from the migration.

### Step 3 — Confirm GitHub secrets are present

The workflow needs two secrets in `Settings → Secrets and variables → Actions`:

- `SUPABASE_URL` — same value as `VITE_SUPABASE_URL` in `.env`
- `SUPABASE_SERVICE_ROLE_KEY` — service-role JWT from
  `Supabase dashboard → Project settings → API`

These should already exist from the E35.7 / CI hardening era. To
verify without exposing values: `Settings → Secrets → Actions` lists
secret names but not values.

### Step 4 — Trigger the workflow manually once

`GitHub → Actions → "Retention cron" → Run workflow`.

The run should:
1. Check out the repo
2. Set up Node 20
3. Install runtime deps (`npm ci --omit=dev`)
4. Run `node scripts/run-retention.mjs`

Expected log lines:

```
[retention] target: https://<project>.supabase.co
[retention] mode: live
[retention] schedule: daily 03:00 UTC via GH Actions
[retention] purge_expired_attempts() ok in <ms> — rows affected: <n>
[retention] anonymize_expired_anticheat() ok in <ms> — rows affected: <n>
[retention] anonymize_expired_edu_respondents() ok in <ms> — rows affected: <n>
```

If any step fails, the run exits non-zero and GitHub sends a
notification email.

### Step 5 — Future operation

The schedule fires every day at 03:00 UTC. No manual intervention is
needed except:

- **CVE / dep update breaks the script** — Dependabot opens a PR
  (E35.7); merge after CI passes.
- **GH Actions free-tier minutes exhausted** — extremely unlikely;
  the workflow runs <30s per day. Monitor in `Settings → Billing`.
- **Supabase rotates the service-role key** — update the
  `SUPABASE_SERVICE_ROLE_KEY` secret immediately. The next scheduled
  run will pick it up.

## What we deliberately did NOT do

- **Did not enable pg_cron.** Supabase Free tier doesn't include it
  (Pro+ only, $25/mo). PLAN D1 chose GH Actions cron because it's
  free, already in active use, and produces native GitHub log output.
- **Did not refactor anti-cheat data out of `attempts.flags`.** No
  schema change in this epic — anonymisation works by setting flags
  to `'[]'::jsonb` in place.
- **Did not touch sponsorship / audit_log retention.** Sponsorship is
  10 years (no purge needed); audit_log is indefinite by design
  (Art. 28 obligations).

## Backfill / replay

If a scheduled run is missed (GH peak load delays it by >24h, which
is rare but possible), trigger `workflow_dispatch` to catch up. The
RPCs are idempotent — calling them twice on the same day is harmless.

## Rollback

If a retention RPC misbehaves (e.g. anonymises too many rows):

1. Disable the cron immediately:
   `Settings → Actions → Workflows → "Retention cron" → Disable workflow`
2. Investigate the function via the SQL editor. Anti-cheat and edu
   anonymisation are NULL-out operations — the rows still exist; the
   removed data is gone. Re-deriving it is not possible from the DB
   alone.
3. If a regression is found, the fix is a new migration (don't try
   to revert via the workflow disable). Update the function body,
   submit a new PR, follow the standard merge flow.

## Cost

| Component | Cost |
|---|---|
| GitHub Actions scheduled workflow | Free (within standard quota) |
| Supabase RPC invocations | Free (counts against query quota; 3 calls/day is negligible) |
| Service-role key storage | Free (GitHub repo secrets) |
| **Total** | **$0/mo** |
