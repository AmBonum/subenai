# E40 — DPA automation operator runbook

This runbook documents the operator-side steps required to take the DPA
automation flow from "merged behind feature flag" to "live in production".

Epic: [E40 — DPA automation](./PLAN-2026-05-20-E40-dpa-automation.md).
Audience: the `am.bonum s. r. o.` operator.

## Pre-go-live checklist

### 1. Database migration

Migration `supabase/migrations/20260521200000_dpa_requests.sql` (from
E40.1) creates the `dpa_requests` table + `anonymize_expired_dpa_requests()`
RPC. After merging to `main`:

```sh
# Option A — via the dashboard SQL editor:
#   Paste DEPLOY_SETUP.sql section "20260521200000_dpa_requests.sql"
#   into Supabase Studio → SQL editor → Run.
#
# Option B — via supabase CLI (if wired):
supabase db push --linked
```

Verify after applying:

```sql
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'dpa_requests';
-- Expected: 1

SELECT proname FROM pg_proc
WHERE proname = 'anonymize_expired_dpa_requests';
-- Expected: 1 row
```

### 2. Cloudflare Pages env vars

Set in **Pages → subenai → Settings → Variables and Secrets**, scope **Production**:

| Variable | Value | When to set |
|---|---|---|
| `VITE_DPA_FLOW_ENABLED` | `false` initially → `true` after legal sign-off | Pre-merge: keep unset/false. Post-legal: flip to `true`. |
| `VITE_DPA_TEMPLATE_DRAFT_WATERMARK` | `true` until v1.0 legal sign-off | Flip to `false` only after counsel approves the v1.0 template revision. |
| `RESEND_API_KEY` | `re_*` (already provisioned for portal magic link) | Reused — no new key needed. |
| `EMAIL_FROM` | `noreply@subenai.sk` (already set) | Reused. |
| `EMAIL_REPLY_TO` | `kontakt@subenai.sk` (already set) | Reused. |
| `DPA_PER_IP_PER_HOUR` | `3` | Optional — defaults sensible. |
| `DPA_COOLDOWN_SECONDS` | `600` | Optional. |
| `DPA_DAILY_CAP` | `50` | Optional. |
| `DPA_EMAIL_PER_IP_PER_HOUR` | `6` | Optional. |

After flipping `VITE_DPA_FLOW_ENABLED=true`, redeploy from the
Cloudflare dashboard (Deployments → Latest → Retry deployment) so the
new env value is baked into the client bundle.

### 3. Legal review sign-off log

The v0.1 template draft (`src/lib/dpa/dpa-template.tsx`) and supporting
copy (`/privacy` retention section, intake-form consent label) MUST be
reviewed by a qualified Slovak GDPR counsel before flipping the
production feature flag.

Add each review pass to the log below:

| Date | Reviewer | Template version | Outcome | Notes |
|---|---|---|---|---|
| *pending* | — | v0.1 | — | Initial legal review not yet scheduled. |

When the v1.0 sign-off lands:
1. Bump `DEFAULT_DPA_TEMPLATE_VERSION` in `src/lib/dpa/feature-flag.ts` from `"v0.1"` to `"v1.0"`.
2. Bump `TEMPLATE_VERSION` in `functions/api/dpa-request.ts` to `"v1.0"`.
3. Set Cloudflare env `VITE_DPA_TEMPLATE_DRAFT_WATERMARK=false`.
4. Redeploy.
5. Verify a fresh request renders a PDF WITHOUT the diagonal watermark.

### 4. GitHub Actions retention cron

The existing daily workflow at `.github/workflows/retention-cron.yml`
now also calls `anonymize_expired_dpa_requests()`. No env changes
needed — the workflow already uses `SUPABASE_SERVICE_ROLE_KEY` from
the repo secrets.

Verify the next 03:00 UTC run (or trigger manually via
`workflow_dispatch`):
- Workflow logs four `rpc ok in Xms` lines (was three pre-E40.6).
- Counts can be `0` if no rows are 12+ months old yet — expected
  during the first year.

### 5. Resend domain verification

`Resend → Domains → subenai.sk` must show DKIM + SPF + DMARC as
"Verified" (green checkmarks). Already verified for portal magic link
delivery — no new DNS work needed.

If DKIM goes stale (rare), e-mails will land in spam or be rejected;
DPA delivery would fail and the admin panel (`/admin/dpa-requests`)
would show `email_status='failed'` with `email_error` populated.

### 6. Smoke check after go-live

After flipping the flag:

1. Open `https://subenai.sk/schools/dpa` in a fresh incognito window.
2. Verify Turnstile widget renders.
3. Fill the form with a test e-mail (your own).
4. Submit.
5. Verify:
   - PDF downloads automatically (filename `DPA-subenai-{slug}-v0.1.pdf`).
   - PDF opens in Acrobat / Preview without errors.
   - DRAFT watermark visible on every page (until legal sign-off + v1.0).
   - E-mail arrives within ~30s at the test address with the PDF
     attached.
6. Sign in to `/admin/dpa-requests` as the admin user.
7. Verify the row appears with `email_status='sent'`.
8. Click "Anonymizovať", confirm, verify the row's name + e-mail flip
   to `—`.

If any step fails, flip `VITE_DPA_FLOW_ENABLED=false` in CF Pages
env + redeploy to restore the legacy mailto CTA. Investigate the
failure mode offline before re-enabling.

## Rollback

To revert end-user-visible behavior to the legacy mailto:

1. Cloudflare Pages → env → `VITE_DPA_FLOW_ENABLED=false`.
2. Redeploy.
3. The `/schools` GDPR card immediately points to `mailto:CONTACT_EMAIL`.
4. The `/schools/dpa` route still exists but renders the
   "DPA tok je v príprave" fallback.

Data already collected in `dpa_requests` is **not** affected by the
flag flip — admin can still process the queue via `/admin/dpa-requests`.
