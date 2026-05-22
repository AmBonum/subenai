# PLAN — Edu test "Link pre respondentov" returns "Test nenájdený"

## Symptom (2026-05-22, reported on prod)

1. User builds an edu test from `/test/builder?config=…`.
2. Submit → `EduSuccessDialog` opens with link **"Link pre respondentov"**:
   `https://subenai.sk/test/builder/f9342f27-fe5e-460b-9090-a1aa983d54e4`
3. Opening that link in any tab → **"Test nenájdený"** (status `not_found`).

The link format is correct (matches `ROUTES.builderSet = /test/builder/$id`).
The route loader reads `test_sets` and gets `null`, so the page hits the
`not_found` branch.

## Root cause — most likely hypothesis

**RLS gap introduced by E38 ownership migration.** Sequence:

- Original migration `20260428000000_test_sets.sql` added two SELECT policies:
  - `test_sets_anon_select` → `TO anon USING (true)` — public-by-link for anon
  - (no policy `TO authenticated`)
- E38 migration `20260521150000_e38_test_set_ownership.sql` added:
  - `test_sets_owner_select` → `TO authenticated USING (owner_id = auth.uid())`

Supabase RLS evaluates policies **per role**. `TO anon` policies do NOT apply
to `TO authenticated` requests. So:

| Role | Owner? | Visible? |
|---|---|---|
| anon | n/a | ✓ (anon_select USING true) |
| authenticated | owns | ✓ (owner_select) |
| **authenticated** | **does NOT own** | **✗ no policy matches → row hidden** |

The user who reported the bug was signed in (from earlier audit session as
TU-A), and the test was created either (a) anonymously (owner_id = NULL) or
(b) by a different account. Either way the signed-in viewer hits the gap.

The original contract — *"test_sets are public-by-link, the UUID IS the
secret"* (`20260428000000_test_sets.sql:69-77`) — is silently broken for
authenticated viewers since the E38 migration shipped. The author can copy
the link and send it to a respondent who is anonymous (works), but the
moment a logged-in user opens it (e.g. a teacher quickly testing the link
from their own browser) it 404s.

## Verification steps (5 min)

1. **Confirm row exists** (eliminates "API silently failed" hypothesis):
   ```sql
   SELECT id, owner_id, collects_responses, created_at
     FROM public.test_sets
    WHERE id = 'f9342f27-fe5e-460b-9090-a1aa983d54e4';
   ```
   Expect: 1 row. If 0 rows → fall through to Alt-root-cause § below.

2. **Confirm RLS gap** by running as an anon vs authenticated user.
   Anon — should see the row; authenticated non-owner — should not.

3. **Reproduce in browser**: open the link in a clean incognito tab (anon) →
   should LOAD. Open same link in the audit-bot logged-in tab →
   should 404 (today's behaviour).

## Fix — add public-by-link SELECT for `authenticated`

New migration `supabase/migrations/<ts>_test_sets_public_select_authenticated.sql`:

```sql
-- Restore the public-by-link contract for authenticated viewers.
-- E38 ownership migration scoped SELECT to owners only for the
-- `authenticated` role, which silently 404s share-link viewers who
-- happen to be signed in. The contract (random UUID = secret) is
-- identical for anon and authenticated; mirror the policy.
DROP POLICY IF EXISTS test_sets_authenticated_public_select ON public.test_sets;
CREATE POLICY test_sets_authenticated_public_select
  ON public.test_sets
  FOR SELECT
  TO authenticated
  USING (true);
```

This is purely additive — the owner policy stays for typed `list_my_test_sets`
patterns, but every signed-in user can read any set by id (same as anon).

## Regression tests

1. **Vitest (`tests/integration/test_sets_rls.test.ts`)** — three flows
   against a local Supabase:
   - anon SELECT by id → 1 row
   - authenticated non-owner SELECT by id → 1 row (the fix)
   - authenticated owner SELECT by id → 1 row
2. **Playwright (`e2e/integration/edu/share-link-visibility.spec.ts`)** —
   create a test as anon, then open the link as a different signed-in user
   and assert the take page renders (not the not-found view).

## Alt root cause (run only if § Verification step 1 returns 0 rows)

The API returned a UUID that has no DB row. Possible paths:

- `test-sets.ts` rate-limit (line 79) returned 429 client-side but a stale
  modal opened anyway (defensive: tighten frontend submit handler).
- Insert succeeded server-side then was reverted by a transaction rollback
  inside a deferred trigger.
- Retention purge ran inside the same minute (unlikely — 12-month TTL).

This branch needs a separate investigation; do NOT bundle into the RLS PR.

## Rollout

- One PR. Single migration + one Vitest + one Playwright spec.
- Migration is forward-compatible: re-running `DROP POLICY IF EXISTS …`
  before `CREATE POLICY` keeps it idempotent.
- Apply SQL on prod immediately after merge (per the project's manual
  migration workflow).
- Verify on prod: open the reported URL in an authenticated tab → loads.

## Out of scope (open follow-ups)

- **Re-evaluate the "public-by-link is the security model" choice.** A
  random UUID is fine for casual share but does not survive a leak. A
  share-id token + revocation table would be a senior upgrade — track as
  a separate epic, not in this fix.
- **Owner-claim affordance on the take page.** If a signed-in user opens
  a set they could claim (via the password gate), the take page should
  surface a "Claim this test" CTA. Currently invisible to them.
