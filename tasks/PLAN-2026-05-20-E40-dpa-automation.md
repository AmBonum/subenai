# E40 — DPA automation (intake form → PDF → email → admin trail)

**Owner:** Claude — drives the follow-up on E19's explicit out-of-scope row "DPA PDF generation or download endpoint" ([PLAN-E19:200](./PLAN-2026-05-19-E19-schools-senior-rework.md))
**Date opened:** 2026-05-20
**Status:** 🟡 Planned — branch `feature/E40-dpa-automation` to be created from `main`

## TL;DR

`/schools` currently advertises **"Napíš nám — dostaneš DPA do 1 pracovného dňa"** but the CTA is a plain `mailto:` ([SchoolsGdprCard.tsx:85-91](../src/components/schools/SchoolsGdprCard.tsx:85)). That means:

- The user's e-mail client opens with an empty body — they must compose the request themselves.
- No DB record exists of who asked for a DPA, when, for which school.
- The "1 working day" promise depends on a human (the operator) checking inbox and replying with a PDF that lives outside the repo.
- No admin trail. No audit. No analytics. No template versioning.

This epic replaces the `mailto:` with a real intake flow: school contact fills a short form (name + e-mail + school name), the server generates a pre-filled Slovak Art. 28 GDPR DPA in PDF, the user **downloads it instantly AND receives a copy by e-mail**, and the request is persisted in `dpa_requests` for the admin to inspect at `/admin/dpa-requests`.

## Scope

### In
- New table `public.dpa_requests` with RLS (insert: `anon`, select: `admin` only) — schema mirrors the existing `dsr_requests` pattern.
- New public route `/schools/dpa` — minimal intake form (name + e-mail + school name + GDPR-consent checkbox). Linked from the existing `schools-gdpr-dpa-link` CTA.
- New server function (TanStack Start `createServerFn`) that:
  - Validates the payload.
  - Inserts a row in `dpa_requests`.
  - Generates the DPA PDF in-memory via `@react-pdf/renderer` (server-side render).
  - Sends an e-mail with the PDF attached via Resend (new dependency).
  - Returns the PDF as a base64 blob so the browser can also trigger a direct download.
- Slovak Art. 28 GDPR DPA template (`src/lib/dpa/template-v1.tsx`) — version-stamped, marked **v0.1 DRAFT — REQUIRES LEGAL REVIEW BEFORE PUBLIC LAUNCH**.
- New admin panel `/admin/dpa-requests` — list, search by school, view request detail, manual status flips (`pending` → `delivered` → `signed`).
- Retention: 12-month auto-anonymisation of `contact_name` + `contact_email` in `dpa_requests` (extends the existing E38 cron with a new RPC).
- CHANGELOG entry + privacy-page copy update (the data flow is new — disclose it on `/privacy`).

### Out — explicitly NOT in this epic
- E-signature integration (DocuSign / SignWell / SetSign). Schools still sign offline and e-mail the executed PDF back; admin uploads it manually.
- Multi-version template management UI. Template version bumps are code-only (new file `template-v2.tsx`, bump `DEFAULT_TEMPLATE_VERSION`).
- DPA i18n. Slovak only for v1 — matches the audience.
- IČO / DIČ field. Out-of-scope per the operator's product decision (2026-05-20): keep the form to three fields to maximise completion. The PDF leaves a placeholder for the school to fill in at signing time.
- Microsoft 365 / Google Drive sync. The signed PDF stays in operator e-mail / admin panel.
- Self-service "delete my DPA request" flow for the school contact. They can already exercise Art. 17 GDPR by writing to `CONTACT_EMAIL` — admin deletes via the existing DSR queue.

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| D1 | **Separate route `/schools/dpa`** rather than an inline dialog on `/schools` | SEO-discoverable, shareable URL, simpler focus / a11y story, easier Playwright coverage. The cost is one extra click vs. modal. |
| D2 | **PDF generation server-side** via `@react-pdf/renderer` `pdf().toBuffer()` | Same render path for instant download + e-mail attachment. No client-side legal-text divergence. Bundle stays clean (browser doesn't ship the template). |
| D3 | **Both delivery channels** — instant download AND e-mail copy | The operator's product decision (2026-05-20). Two independent code paths; e-mail failure does not block download. |
| D4 | **Resend** as the e-mail provider, account owned by `am.bonum s. r. o.` (DKIM on `subenai.sk`) | Modern API, generous free tier (3k/mo), good DX. Alternative SES / Mailgun rejected: SES requires more infra, Mailgun's free tier is gone. Operator-owned account (not personal) keeps the Art. 28 chain clean — `am.bonum` is the processor of record. **Resolved 2026-05-20.** |
| D5 | **Generic Art. 28 GDPR template v0.1** authored in-repo | Operator does not have an existing approved template ([2026-05-20]). Code includes a prominent banner that legal review is REQUIRED before flipping the feature on for live `subenai.sk` traffic. Until that review lands the route stays behind a feature flag `VITE_DPA_FLOW_ENABLED=false` so the legacy `mailto:` keeps working. |
| D6 | **12-month retention** of `dpa_requests` PII (name + e-mail) | Matches the existing 12-month respondent retention claim ([/privacy](../src/routes/privacy.tsx)). New RPC `anonymize_expired_dpa_requests()` plugs into the E38 GitHub Actions cron. School name + `dpa_version` stay (aggregate stats — non-PII). |
| D7 | **No `CONSENT_VERSION` bump** | The data being collected (name + e-mail for the explicit purpose of executing a DPA) sits under a separate lawful basis (Art. 6(1)(b) — pre-contractual measures, not Art. 6(1)(a) consent). The consent banner governs cookies/analytics; this flow has its own explicit checkbox on the form ("súhlasím so spracovaním pre účely DPA"). |
| D8 | **Template versioning via DB column** `dpa_version text NOT NULL` | When legal revises the template, `template-v2.tsx` ships alongside v1; old records remember which version they received. Required to answer "which exact text did school X agree to?" — a real Art. 28(9) obligation. |

## Story map

| ID | Title | Effort | Priority | Status |
|---|---|---|---|---|
| [E40.1](./stories/E40.1-dpa-requests-schema.md) | `dpa_requests` table + RLS + types regen + RPC for retention | `S` | `P1` | ✅ Done |
| [E40.2](./stories/E40.2-dpa-form-route.md) | `/schools/dpa` route + intake form + server function (download path) | `M` | `P1` | 🟡 Ready |
| [E40.3](./stories/E40.3-dpa-pdf-template.md) | Slovak Art. 28 DPA template v0.1 + react-pdf render harness | `L` | `P1` | 🟡 Ready |
| [E40.4](./stories/E40.4-dpa-email-delivery.md) | Resend integration + e-mail attachment path + env secret | `M` | `P1` | 🟡 Ready |
| [E40.5](./stories/E40.5-admin-dpa-panel.md) | `/admin/dpa-requests` list + detail + status flips | `M` | `P2` | 🟡 Ready |
| [E40.6](./stories/E40.6-retention-integration.md) | Extend E38 retention cron to call new anonymise RPC + privacy copy + CHANGELOG + CTA rewire | `S` | `P2` | 🟡 Ready |

**Total estimate:** ~7–9 dev-days for one developer working solo. With the feature-flag gate (D5) the epic can ship in two phases — phase A (E40.1–E40.4 behind flag, on a staging URL for legal review) and phase B (legal sign-off → flag on → E40.5 + E40.6 land on main).

## Sprint estimate

| Phase | Stories | Estimate | Pre-condition |
|---|---|---|---|
| **A — implementation behind flag** | E40.1, E40.2, E40.3, E40.4 | 5–6 days | Resend account provisioned, API key in repo secrets (`RESEND_API_KEY`) and CF Pages env. |
| **Legal review** | — (out-of-code) | 2–10 working days | Phase A merged on a preview deploy; legal counsel reviews v0.1 template + form copy + privacy disclosure. |
| **B — go-live polish** | E40.5, E40.6 | 2–3 days | Legal sign-off on v0.1 template. |

## Discovery — current state

**Verified 2026-05-20:**

1. CTA target — [SchoolsGdprCard.tsx:85-91](../src/components/schools/SchoolsGdprCard.tsx:85): `href={mailto:${CONTACT_EMAIL}?subject=...}` — no form, no record.
2. Existing PDF infrastructure — [pdf-document.tsx](../src/lib/edu/pdf-document.tsx) (E38 results export) uses `@react-pdf/renderer`. Lazy-imported. Reusable for the DPA template via the same `<Document><Page>` primitive.
3. Existing intake form pattern — [IntakeStep.tsx](../src/components/respondent/IntakeStep.tsx) — name + e-mail + GDPR-consent checkbox; test-ids prefixed `respondent-flow-intake-*`. The DPA form mirrors this UX (prefix `schools-dpa-form-*`).
4. Existing admin table pattern — `dsr_requests` (admin DSR queue at `/admin/dsr`). Same schema shape (`id`, `created_at`, `status`, contact PII fields). `/admin/dpa-requests` reuses this layout.
5. Existing retention cron — [.github/workflows/retention-cron.yml](../.github/workflows/retention-cron.yml) (E38) calls three RPCs daily at 03:00 UTC. E40.6 adds a fourth call.
6. No `dpa_requests` table, no Slovak DPA template, no Resend integration in the repo today. Greenfield on all three.

## Risks + Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Legal review of v0.1 template returns major revisions, delaying phase B | High | Feature-flag (D5) — phase A ships disabled. Legacy `mailto:` keeps working until flag flip. No user-visible breakage. |
| Resend e-mail delivery fails (down provider, blocklist) | Medium | E-mail is the SECONDARY channel — instant download already worked. Server function catches the Resend error, logs it, writes `email_status='failed'` on the row. Admin sees the failure and can manually resend. |
| Server-side react-pdf rendering bloats the Cloudflare Worker bundle | Medium | Same `@react-pdf/renderer` library is already in the bundle via E38. Verify with `npm run build` bundle-size diff. If > 50 KB delta, switch to a Cloudflare Worker subroute with code-splitting. |
| Spam / abuse — bots submit fake school-name records to flood admin queue | Medium | Server-side rate limit by IP hash (max 3 requests / 15 min). Honeypot field on the form. Cloudflare Turnstile token verification on submit. |
| PII in DB before user finishes reading the privacy disclosure | Low | Form requires explicit "súhlasím" checkbox BEFORE submit is enabled (mirrors intake pattern). |
| Operator forgets to flip the feature flag after legal approval | Low | Default the flag to `true` in `.env.example` and document in the runbook (E40.6). The `false` in production env is the explicit override during phase A. |

## Open questions

### Resolved 2026-05-20

- **Q1 ✅**: Resend account ownership → `am.bonum s. r. o.`-owned, DKIM on `subenai.sk`. Operator provisions before E40.4 kickoff.
- **Q2 ✅**: From-address → `noreply@subenai.sk`. School can reply to `kontakt@subenai.sk` per the e-mail body CTA.
- **Q3 ✅**: Cloudflare Turnstile is NOT in the repo today — add as a hard dependency of E40.2 (15-minute setup, free tier, fits the existing Cloudflare Pages deployment). New env vars: `VITE_TURNSTILE_SITE_KEY` (client) + `TURNSTILE_SECRET_KEY` (server, verifies token).

### Outstanding

- **Q4**: Should the form also collect a phone number (optional) for legal counsel to call back during contract negotiation? Operator decision pending — not blocking, can be added in v1.1 if useful.

## Done Definition (epic-level)

- All 6 stories ✅
- `npm run lint` 0/0, `npm test` 100% pass, `npm run build` ✓
- Schema migration applied on production Supabase manually post-merge (per CLAUDE.md rule)
- `RESEND_API_KEY` provisioned in Cloudflare Pages env + GitHub Actions secret
- E2E Playwright spec `e2e/specs/marketing/schools-dpa.spec.ts` covers happy-path submit + download + admin sees row
- `/privacy` s5/s6 copy updated to disclose the DPA intake data flow
- CHANGELOG entry: "Automatizovaný DPA tok — žiadosť cez formulár, okamžité stiahnutie PDF, e-mailová kópia, admin prehľad."
- Legal review sign-off on `src/lib/dpa/template-v1.tsx` documented in `tasks/E40-runbook.md`
- Feature flag `VITE_DPA_FLOW_ENABLED=true` flipped on production CF Pages env
- Fresh-context CR run before final PR merge to `main`
