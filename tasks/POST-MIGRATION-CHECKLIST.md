# Post-migration checklist

**When to use:** after running any `supabase/migrations/*.sql` against the
production Supabase instance. Do not skip — the E48 incident was caused by
a partial migration that reported "Success. No rows returned" while silently
failing to register the RPC in PostgREST's schema cache.

---

## §1 — Apply the migration

1. Open the Supabase dashboard → SQL editor.
2. Paste the migration SQL and run it.
3. Confirm the status bar says "Success" **and** check the "Messages" panel
   for any `NOTICE` or `ERROR` lines. A top-level `CREATE FUNCTION` returning
   `0 rows` is expected; an error in a nested statement may not surface as a
   top-level failure.

---

## §2 — Force PostgREST schema cache refresh

After any DDL that adds or changes functions/tables/views, PostgREST must
reload its introspected schema or it will return `42883 undefined_function`
for newly-created RPCs:

```sql
NOTIFY pgrst, 'reload schema';
```

Run this in the SQL editor immediately after the migration. The NOTIFY is
cheap and idempotent — running it multiple times is safe.

**Why this is required:** PostgREST caches the schema at startup and after
`NOTIFY pgrst, 'reload schema'`. Without the NOTIFY, even a perfectly applied
migration is invisible to the REST layer until the next PostgREST restart
(which happens on Supabase instance restarts, not on migrations).

---

## §3 — Verify schema invariants

Run the schema invariant Vitest suite against production to confirm the
expected RPCs and tables are reachable:

```bash
VITE_SUPABASE_URL=<prod_url> \
PROD_INVARIANT_CHECK_KEY=<service_role_key> \
npx vitest run tests/db/prod-schema-invariants.test.ts
```

All tests must pass. If any fail:
- RPC test fails → the RPC was not created. Re-check the migration SQL and
  look for nested errors in the SQL editor Messages panel.
- Table test fails → the table was not created or RLS is blocking service_role
  (unusual — service_role bypasses RLS). Re-run the migration.
- `__test_introspect_function` itself fails → the helper migration
  (`20260522120000_test_introspect_function.sql`) has not been applied yet.
  Apply it first, then re-run.

---

## §4 — Tail Cloudflare function logs

After the schema refresh, trigger a real request through the affected CF
function and watch the logs for 5 minutes:

1. Cloudflare dashboard → Workers & Pages → subenai → Functions → Logs.
2. Fire a test request (e.g. submit the `/kontakt` form with a test email).
3. Confirm no `42883` or `undefined_function` errors appear.
4. Confirm the success response includes the expected fields (e.g. `ticket_id`
   for `submit_support_ticket`).

---

## §5 — Run the prod smoke (manual trigger, optional)

For high-risk migrations (new RPC, schema change to ticketing tables, auth
changes) also run the full Playwright smoke test:

```bash
CI_PROD_SMOKE=1 npx playwright test --project=prod-smoke
```

Or trigger it from the GitHub Actions tab:
Actions → "Production smoke" → "Run workflow".

The smoke test submits a real `[CI-SMOKE]` ticket and asserts a `ticket_id`
is returned. Pass = full pipeline healthy.

### Smoke ticket cleanup {#smoke}

Tickets created by the smoke test are tagged `[CI-SMOKE]` in the subject.
Clean them up within 1h to avoid queue noise:

```sql
DELETE FROM public.support_tickets
WHERE subject LIKE '[CI-SMOKE]%'
  AND created_at < now() - interval '1 hour';
```

Or wire this as a `pg_cron` job (run hourly):

```sql
SELECT cron.schedule(
  'purge-ci-smoke-tickets',
  '0 * * * *',
  $$
    DELETE FROM public.support_tickets
    WHERE subject LIKE '[CI-SMOKE]%'
      AND created_at < now() - interval '1 hour';
  $$
);
```

---

## §6 — Activate CI monitoring (one-time, post-merge)

After merging the PR that introduced `tests/db/prod-schema-invariants.test.ts`:

1. Add GitHub Actions secrets (repo Settings → Secrets → Actions):
   - `VITE_SUPABASE_URL` — the production Supabase project URL
   - `PROD_INVARIANT_CHECK_KEY` — the service_role key (or a narrower key with
     EXECUTE on `public.__test_introspect_function` and SELECT on the tables)

2. The `ci.yml` "Schema invariants" step runs automatically on every PR once the
   secrets are set. PRs from external contributors (forks) do not receive secret
   values — the step is gated with `if: env.VITE_SUPABASE_URL != ''` and skips
   rather than failing.

3. To enable the daily prod smoke cron, uncomment the `schedule:` block in
   `.github/workflows/prod-smoke.yml` and push to `main`.

4. Apply the helper migration on production:
   ```
   supabase/migrations/20260522120000_test_introspect_function.sql
   ```
   (Follow steps §1–§2 of this checklist for the migration itself.)

---

## §7 — Rollback playbook

If a migration causes immediate production errors:

1. **Do not** run a `DROP` in the same SQL editor session without testing it on
   a copy first. Dropping the wrong object with active connections can cascade.
2. Identify the failing statement from CF function logs (PG error code + detail).
3. Write a compensating migration that `DROP`s only the new object or reverts
   the specific `ALTER`. Test in the Supabase SQL editor using `BEGIN; ... ROLLBACK;`.
4. Apply the compensating migration and follow §1–§4 again.
5. File a post-mortem commit to `tasks/` with the incident timeline.
