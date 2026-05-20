# E45 — Appendix B: Email + invite design (Slovak copy, GDPR, deliverability, ops)

**Status:** Draft, ready for Phase 3 implementation (`E45.13` template + `E45.14` send endpoint + `E45.17` ops runbook).
**Author:** Claude (planning subagent, `marketing:draft-content` + `engineering:documentation` skills).
**Scope:** All artifacts needed for the email-invite track in `tasks/PLAN-2026-05-21-E45-test-detail-editor.md` Decisions D6, D7 and Risks R3, R6. Companion to Appendix A (security / audit), C (UX), D (respondent flow).
**Boundary:** This appendix is **English** per CLAUDE.md. Slovak appears only inside `"..."` for verbatim UI / email / privacy strings. No code or template files are edited — TypeScript snippets in section 9 are quoted, ready for the Phase 3 agent to paste.

---

## 1. Email subject lines (verbatim Slovak)

Two variants, chosen by the `optInPassword` flag from the author's "Send password in this email" checkbox (D7).

| Variant | Trigger | Verbatim subject |
|---|---|---|
| Default (password OPT-IN OFF) | `optInPassword === false` (default per D7) | `"Pozvánka na test: {test_title}"` |
| Password included (OPT-IN ON) | `optInPassword === true` (author opted in) | `"Pozvánka na test: {test_title} (heslo v tomto e-maile)"` |

**Why two subjects.** When the password is in the body, the subject must surface that fact for three reasons:

1. **Spam-filter reputation.** Modern spam filters (Resend, Gmail, Outlook ATP) flag the pattern *"login link + password in same body"* if the subject hides the second factor. Surfacing `(heslo v tomto e-maile)` aligns subject and body intent — filters classify the message as a known transactional onboarding pattern, not credential-phishing.
2. **Recipient context.** A respondent forwarding the invite to a colleague (or pasting it into a shared inbox) sees at a glance that the body contains a credential. They can decide not to forward — protects the second factor.
3. **DPO traceability.** When a recipient later complains "I never agreed to receive my password by email", the subject line itself is evidence the platform did not obscure that the body included a credential.

`{test_title}` is HTML-escaped + truncated to 80 chars in the templating layer to keep the subject under the 78-char soft limit for legacy mail readers.

## 2. Email body — TEXT version (verbatim Slovak)

This is the canonical text the Phase 3 agent pastes into `testInviteEmail.text`. It is the plain-text alternative that Gmail, Apple Mail, and screen readers fall back to when HTML is blocked.

```text
Ahoj,

{authorName} ťa cez subenai.sk pozval/a vyplniť test.

Test: {testTitle}
Odkaz na vyplnenie: {testUrl}

[ak optInPassword === true:]
Heslo: {password}
Heslo zadáš pri vstupe do testu. Nezdieľaj ho ďalej.
[/ak]

[ak optInPassword === false:]
Test je chránený heslom. {authorName} ti ho pošle iným kanálom (správa,
telefón, ústne) — je to bezpečnejšie, než ho posielať e-mailom spolu s odkazom.
[/ak]

Súkromie: tvoju e-mailovú adresu nám poskytol/la {authorName} výhradne pre
doručenie tejto jednej pozvánky. My (subenai) si neukladáme tvoj e-mail v
otvorenom tvare — uchovávame iba kryptografický odtlačok (SHA-256) na účely
auditu počas 30 dní, potom sa zmaže. Plný popis: https://subenai.sk/privacy

Ak nechceš ďalšie pozvánky od {authorName}, kontaktuj ho/ju priamo — my
nevidíme, koho si pozýva. Otázky k spracovaniu osobných údajov:
support@subenai.sk.

Otázky alebo problém s testom? Odpovedz priamo na tento e-mail —
príde to {authorName}.

—
subenai.sk · support@subenai.sk
```

**Word-count budget.** ~165 words including conditional block. Fits the 120–180 target from the prompt, leaves ~9 KB after escaping for mail clients that throttle on body size (Gmail clips after ~102 KB; we are far under).

**Greeting choice.** `"Ahoj"` — informal Slovak, matches the platform's voice on `/o-nas`, `/changelog`. No first-name personalization because we do not collect recipient first names (D6 — author provides only the email address). Using `"Vážený respondent"` would be safer-formal but inconsistent with subenai's overall tone.

**Author attribution.** `{authorName}` is `auth.users.raw_user_meta_data.display_name` (or email-local-part fallback if display name is null) — same value already used in the test detail header. It is rendered as plain text (no link), so a phishing actor cannot pretend the message comes from someone else by spoofing a profile URL.

**Reply-to behavior.** The reply-to header is set to `EMAIL_REPLY_TO` (currently `subenai.podpora@gmail.com`) — NOT the author's email. Reasons: (1) the author has not consented to publish their email to invitees; (2) routing replies through our shared inbox lets us catch bounce/complaint chatter we'd otherwise miss; (3) the body explicitly tells the recipient `"Odpovedz priamo na tento e-mail — príde to {authorName}"` which is technically misleading until Phase 5+ adds reply-forwarding. **Mitigation for Phase 3:** drop that sentence until reply-forwarding ships. Tracked as a Phase 3 acceptance criterion.

> **Open question Q-B1.** Should the reply-to be the author's email after the author explicitly opts in (separate checkbox)? Default: NO for Phase 3 — single-channel privacy posture is simpler.

## 3. Per-recipient privacy footer (verbatim Slovak, dedicated block)

This is the GDPR-mandated per-recipient transparency notice, identical in both text and HTML versions. Required by Art. 14 GDPR because we obtained the recipient's email from a third party (the author), not from the recipient directly.

```text
Tento e-mail si dostal lebo {authorName} ťa cez subenai.sk pozval/a na test.
Tvoju adresu sme spracovali iba pre toto doručenie a uchovávame jej
kryptografický odtlačok počas 30 dní. Ak nechceš ďalšie pozvánky od tohto
autora, kontaktuj ho priamo. Otázky k spracovaniu: support@subenai.sk.
```

The `{retention_days}` placeholder from the prompt is materialized as **30 dní** — matches `audit_log_retention_days` already in `/privacy s5`.

## 4. Email body — HTML version

Same content as the text, plain styled HTML. Constraints applied:

- Width **600 px max** (renders in Outlook 2016 default reading-pane width).
- **Inline CSS only.** No `<style>`, no `<link>`, no `<script>`. Outlook 2016/2019 strips `<style>` from `<head>`; Gmail strips `<link>`; both are spam signals.
- **No tracking pixel.** Resend default tracking pixel is disabled at send-time via `tracking: { open: false, click: false }` in the Resend request body (`functions/_lib/email.ts` already supports this; Phase 3 just sets the flag for this template). Rationale: open / click tracking would require a new processor disclosure on `/privacy` and a CONSENT_VERSION bump — out of scope per epic D-out.
- **Semantic headings.** `<h1>` reserved for the subenai brand row (matches `wrap()` in `email-templates.ts`); the test title uses `<h2>`. Screen readers (NVDA, VoiceOver) announce the heading hierarchy.
- **Alt text** on the single link button (`alt="{authorName} ťa pozval/a na test"`) — Gmail's "images off" mode shows alt text.
- **Color contrast.** Body text `#0f172a` on `#ffffff` = 16.5:1 (WCAG AAA). Footer text `#475569` on `#ffffff` = 7.7:1 (WCAG AAA).

Reuses the existing `wrap()` HTML scaffold from `functions/_lib/email-templates.ts`. The inline structure of the new template body:

```text
<h2>Pozvánka na test: {testTitle}</h2>
<p>Ahoj, {authorName} ťa cez subenai.sk pozval/a vyplniť test.</p>
<p>Test: <strong>{testTitle}</strong></p>
<p style="margin:24px 0">
  <a href="{testUrl}"
     style="display:inline-block;background:linear-gradient(135deg,#bef264,#16a34a);color:#0f172a;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:12px"
     alt="{authorName} ťa pozval/a na test">
    Otvoriť test
  </a>
</p>
{password block if optInPassword === true else out-of-band notice}
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
{per-recipient privacy block (section 3)}
```

The existing `FOOTER_HTML` block (am.bonum s.r.o. + legal address + reply hint) renders below via `wrap()`. We do NOT duplicate the company info inside the body — it lives only in the footer.

## 5. GDPR processor analysis

Three sentences as required by the prompt:

1. **Resend is already disclosed** as a sub-processor under `/privacy` section **s4** (id `privacy-section-s4`, i18n key `s4.resend_label` + `s4.resend_text`) and the disclosure text "sprostredkovateľ pre transakčné e-maily" covers the new invite-sending purpose because the purpose category is identical (one-shot transactional delivery on behalf of subenai users), not a new processor category.
2. **The new lawful basis** for sending invite emails is **Art. 6(1)(b) GDPR — performance of a contract**, specifically `"Plnenie zmluvy / doručenie pozvánky"` between subenai and the author (the author triggers the send through the test-detail UI); the recipient's data is processed under **Art. 6(1)(f) — legitimate interest** of the author in inviting respondents and of subenai in operating the platform, balanced against minimal data (email only, 30-day hash retention).
3. **`/privacy` does NOT need a delta** for E45 Phase 3 because the existing s4 disclosure text already names Resend with the unqualified phrase "transakčné e-maily" (transactional emails) which encompasses test-invite emails; the only candidate change would be to add the example "(pozvánka na test od autora platformy)" to the parenthetical list of examples in `s4.resend_text`, but this is **optional polish, not a legally required change**, and would unnecessarily bump `CONSENT_VERSION` and re-show the cookie banner to 100% of users for a non-substantive edit.

**Recommendation:** **No `/privacy` delta** in Phase 3. The s4 disclosure is sufficient. Defer the optional copy refinement to a future docs polish PR that batches multiple s4 wording tweaks together and is calibrated to bump `CONSENT_VERSION` only once.

## 6. CF Pages env-var inventory

All required env vars are already provisioned from E11 (see `tasks/E11-email-runbook.md` § "Required env vars"):

| Name | Set since | Used in E45 Phase 3? |
|---|---|---|
| `RESEND_API_KEY` | E11 (2026-04-XX) | Yes — same key, same account |
| `EMAIL_FROM` | E11 | Yes — `subenai <noreply@subenai.sk>` for invite sends |
| `EMAIL_REPLY_TO` | E11 | Yes — `subenai.podpora@gmail.com` reply destination |
| `OPS_EMAIL` | E11 | No — invite path does not alert ops; reuses recipient-side bounce flow |

**No new env vars** for E45 Phase 3. The Phase 3 PR's deploy checklist (E45.17) is therefore zero-config — pushing the branch to CF Pages is enough; production already has the keys.

## 7. Deliverability checklist for `subenai.sk`

| Layer | Current state (post-E11) | Recommended for E45 |
|---|---|---|
| **SPF** | `v=spf1 a mx include:_spf.m1.websupport.sk include:resend.com -all` already at root TXT | **No change.** Resend already included. |
| **DKIM** | `resend._domainkey.subenai.sk` TXT with Resend's selector signs every outgoing message | **No change.** Resend signs all `noreply@subenai.sk` mail automatically. |
| **DMARC** | `v=DMARC1; p=quarantine; rua=mailto:subenai.podpora@gmail.com` | **No change for Phase 3.** Once invite volume exceeds ~500/day for a sustained week, tighten to `p=reject` (Phase 5+). |
| **Sender domain reputation** | New domain (low volume, ~tens of magic-link sends/month) | **Pre-warm to 100/day** for two weeks before opening invite quotas — see § 7.1. |
| **Auto-warmup strategy** | Manual (E11 has not needed it yet) | See § 7.1 below. |
| **Bounce monitoring** | Resend dashboard → Logs (manual) | **Subscribe Resend webhook** (`email.bounced`, `email.complained`) — see § 8. |
| **mail-tester.com baseline** | E11 verified score ≥ 9/10 | Re-run on the new template before Phase 3 ships. Target ≥ 9/10. |

### 7.1 Auto-warmup strategy

If invite volume jumps suddenly (e.g. an author with 5000 students sends 5000 invites in one batch), `subenai.sk` reputation drops because Gmail / Outlook penalize sudden volume spikes from low-reputation domains. Mitigation, layered:

1. **Soft cap at the send endpoint, recalibrated for free tier.** Per-user
   decision 2026-05-21: stay on **Resend free tier (100/day account-wide)**
   for E45 Phase 3. The per-author daily quota previously written as 200
   (D6) is **revised to 50** so 2 active authors can saturate their day-cap
   without colliding with each other or with transactional sends (magic
   links, DPA delivery, refund alerts) that share the same account.
   Per-test daily quota also drops from 100 → **50** for the same reason.
   Re-evaluate the Pro upgrade ($20/mo, 1000/day) once steady-state daily
   invite volume exceeds 60 (Resend dashboard alert at 60 % of cap).
2. **Slow-start per author.** First three days of invite-sending capability
   for a new author = soft cap 10/day, ramping by 2x/day until the
   per-author floor (currently 50/day). Implementable via
   `author_send_capacity` view on `audit_log` rows. Phase 3 ships the
   revised static cap; slow-start is Phase 5+.
3. **Subdomain split.** When a sustained spike is anticipated (school-year
   start, university exam season), move invite sends to a dedicated
   subdomain `invites.subenai.sk` (own DKIM, own SPF) so a reputation hit
   on invites does not poison transactional `noreply@subenai.sk`. Phase 5+.

For Phase 3 launch, **action item:** confirm the Resend account is on the
free tier (100/day) and that the **D6 per-author cap is 50, per-test cap 50**
in the CF function constants. Documented in E45.17 deploy checklist.

## 8. Rate-limit matrix (D6 + economic justification)

Resend pricing reference (Pro tier, 2026-Q2): $20/mo for 50 000 messages = $0.0004 per message. The prompt cites $0.00006 which is closer to bulk-tier pricing; we use the actual platform tier.

| Layer | Limit | Window | Justification (attack economics) |
|---|---|---|---|
| **Per-IP per-hour** | 50 sends | 1h sliding | Caps a single attacker's burst at $0.02/hr. Even a 24/7 attacker pinning the IP limit costs us $0.48/day per IP — within tolerable noise. |
| **Per-test per-day** | 50 sends *(revised 2026-05-21 — see § 7.2)* | 24h calendar (UTC) | A single test's invite list realistically tops out around 50 (one class, one team). On Resend free tier, 50 is the account-wide cap shared with transactional sends — going higher per-test risks crowding out magic-link delivery. Beyond 50/day, the use-case shifts from "invite peers" to "newsletter-style blast" — out of scope. |
| **Per-author per-day** | 50 sends *(revised 2026-05-21 — see § 7.2)* | 24h calendar (UTC) | Author with 2-3 tests still bounded by the per-test cap. On free tier (100/day shared account), 50 lets at most 2 authors saturate their day. Higher numbers indicate either (a) school-year start (legitimate, but bump after manual review + Pro upgrade) or (b) abuse. Manual review queue triggered at 80 % of cap. |
| **Global per-hour** | 500 sends | 1h sliding | Platform-wide anti-abuse ceiling. At $0.0004/msg, a sustained 500/hr attack costs us $4.80/day in Resend fees — fast enough to detect within the Resend dashboard's daily summary, slow enough that we don't pre-emptively starve a legitimate spike. Trips an `OPS_EMAIL` alert. |

**Implementation hints (for E45.14):**

- Each layer is an independent check; **all four must pass** before the send proceeds (AND, not OR).
- Counters live in Cloudflare KV (already used by `_lib/security.ts` for IP rate-limits in E10 sponsorships).
- Window types: sliding-window for per-hour and global (avoid clock-edge bursts); calendar-day for per-test/per-author (matches "daily quota" UX wording).
- On limit hit: respond 429 with `Retry-After` header + Slovak UI copy `"Dosiahol si denný limit pre pozvánky z tohto testu. Skús zajtra."` (D6 wording).

## 9. `functions/_lib/email-templates.ts` delta — `testInviteEmail`

Code is **not** edited by this appendix. The snippet below is the canonical specification for the Phase 3 agent (story E45.13) to paste. Signature mirrors `magicLinkPortalEmail` — returns `{ subject, html, text }`, accepts a typed input record.

```ts
export interface TestInviteEmailInput {
  recipientEmail: string;       // for personalization-checks only; not echoed in body
  authorName: string;           // already display-name resolved by caller
  testTitle: string;            // HTML-escaped + truncated to 80 chars before passing in
  testUrl: string;              // absolute https://subenai.sk/t/<share_id>
  password?: string;            // present iff optInPassword === true
  optInPassword: boolean;       // mirrors the author's checkbox; defaults to false
  retentionDays?: number;       // defaults to 30; surfaced in privacy block
}

export function testInviteEmail(input: TestInviteEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const retentionDays = input.retentionDays ?? 30;
  const includePassword = input.optInPassword && typeof input.password === "string";

  // Subject — D7 variant
  const subject = includePassword
    ? `Pozvánka na test: ${input.testTitle} (heslo v tomto e-maile)`
    : `Pozvánka na test: ${input.testTitle}`;

  // Plain-text body — see Appendix B § 2 for canonical Slovak copy
  const text = [
    `Ahoj,`,
    ``,
    `${input.authorName} ťa cez subenai.sk pozval/a vyplniť test.`,
    ``,
    `Test: ${input.testTitle}`,
    `Odkaz na vyplnenie: ${input.testUrl}`,
    ``,
    includePassword
      ? `Heslo: ${input.password}\nHeslo zadáš pri vstupe do testu. Nezdieľaj ho ďalej.`
      : `Test je chránený heslom. ${input.authorName} ti ho pošle iným kanálom (správa, telefón, ústne) — je to bezpečnejšie, než ho posielať e-mailom spolu s odkazom.`,
    ``,
    `Súkromie: tvoju e-mailovú adresu nám poskytol/la ${input.authorName} výhradne pre doručenie tejto jednej pozvánky. My (subenai) si neukladáme tvoj e-mail v otvorenom tvare — uchovávame iba kryptografický odtlačok (SHA-256) na účely auditu počas ${retentionDays} dní, potom sa zmaže. Plný popis: https://subenai.sk/privacy`,
    ``,
    `Ak nechceš ďalšie pozvánky od ${input.authorName}, kontaktuj ho/ju priamo — my nevidíme, koho si pozýva. Otázky k spracovaniu osobných údajov: support@subenai.sk.`,
    ``,
    `—`,
    `subenai.sk · support@subenai.sk`,
  ].join("\n");

  // HTML body — uses the existing wrap() scaffold; inline CSS only
  const passwordBlockHtml = includePassword
    ? `<p style="font-size:15px;line-height:1.6"><strong>Heslo:</strong> <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:14px">${escapeText(input.password ?? "")}</code><br/><span style="font-size:13px;color:#475569">Heslo zadáš pri vstupe do testu. Nezdieľaj ho ďalej.</span></p>`
    : `<p style="font-size:13px;line-height:1.6;color:#475569">Test je chránený heslom. ${escapeText(input.authorName)} ti ho pošle iným kanálom — bezpečnejšie, než ho posielať e-mailom spolu s odkazom.</p>`;

  const html = wrap(`
    <h2 style="margin:0 0 12px 0;font-size:18px;color:#0f172a">Pozvánka na test: ${escapeText(input.testTitle)}</h2>
    <p style="font-size:15px;line-height:1.6">
      Ahoj, <strong>${escapeText(input.authorName)}</strong> ťa cez subenai.sk pozval/a vyplniť test.
    </p>
    <p style="margin:24px 0">
      <a href="${escapeAttr(input.testUrl)}"
         style="display:inline-block;background:linear-gradient(135deg,#bef264,#16a34a);color:#0f172a;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:12px">
        Otvoriť test
      </a>
    </p>
    ${passwordBlockHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
    <p style="font-size:12px;line-height:1.6;color:#475569">
      Tento e-mail si dostal lebo ${escapeText(input.authorName)} ťa cez subenai.sk pozval/a na test.
      Tvoju adresu sme spracovali iba pre toto doručenie a uchovávame jej kryptografický odtlačok
      počas ${retentionDays} dní. Ak nechceš ďalšie pozvánky od tohto autora, kontaktuj ho priamo.
      Otázky k spracovaniu: <a href="mailto:support@subenai.sk" style="color:#475569">support@subenai.sk</a>.
    </p>
  `);

  return { subject, html, text };
}
```

**Notes for the Phase 3 implementor:**

- `escapeText` and `escapeAttr` are already exported (private to the module) — reuse them; do not introduce a new escape helper.
- `wrap()` already renders the brand `<h1>subenai</h1>` and the `FOOTER_HTML` block (am.bonum s.r.o. + legal address). The new template does NOT duplicate those.
- The caller (the CF function `send-invites.ts` from story E45.14) is responsible for HTML-escaping `testTitle` before passing it in **only if** it does not trust the source. Since the test title comes from the authenticated owner's own input via authenticated RLS write, the template still defensively escapes (`escapeText` everywhere). Belt + suspenders.

## 10. Bounce + complaint handling

### 10.1 Resend webhook subscription

Subscribe **two** Resend webhook events on the dashboard (Resend → Webhooks → Add endpoint) pointing at a new CF function `functions/api/resend-webhook.ts` (story-tracked in E45.14 acceptance criteria):

| Event | Action |
|---|---|
| `email.bounced` | Look up audit row by Resend message id (stored on send). Mark `status='bounced'`. Optionally store `bounce_reason` and `bounce_type` (hard/soft) in `details.bounce`. **Do NOT retry.** Hard bounce = the recipient's address is dead; soft bounce in our use-case (one-shot transactional, no scheduled re-sends) is functionally the same as hard. |
| `email.complained` | Mark audit row `status='complained'`. **Add the recipient to Resend's built-in suppression list** (Resend dashboard → Suppressions → Add) — they will be auto-blocked for all future sends from this account. **Do NOT roll our own suppression table** (see § 10.2 below for the reasoning). |

The webhook handler must verify Resend's signature (`svix-signature` header) using `RESEND_WEBHOOK_SECRET` — **new env var, single addition for E45.14**. Document in E45.17 runbook delta.

> Correction to § 6: one env var IS new — `RESEND_WEBHOOK_SECRET`. It is set after the Resend webhook is created on the dashboard. Phase 3 deploy checklist must add it before E45.14 ships.

### 10.2 Why use Resend's built-in suppression list, not our own column

| Option | Pros | Cons |
|---|---|---|
| **Resend built-in suppressions** (chosen) | Zero new schema. Cross-account by design — a recipient complaining about a magic-link email is also suppressed from invite emails (correct posture). Resend auto-blocks at send time; we cannot accidentally send to a suppressed address. | Less granular ("never email this address" is binary; we cannot scope per-author). |
| **Our own `suppression_list` table** | Per-author scoping possible. Visible in our admin hub. | Doubles the surface area, new RLS, new env var, new privacy disclosure (we now process complaint metadata as a controller, not a processor — currently it's processor-level under Resend). |

**Decision:** Resend built-in. Documented in E45.17 runbook.

### 10.3 Privacy: does complaint storage require a `/privacy` delta?

**No.** Three sentences of reasoning:

1. Resend processes bounce and complaint events at the **processor level** under our existing E11 sub-processor disclosure — the data is created and stored inside Resend's systems, we only mirror a status flag (`status='bounced' | 'complained'`) back to our audit row.
2. The audit row itself stores no new PII — only `email_hash` (already disclosed under `/privacy s5 → audit log retention`) plus a non-identifying status enum.
3. Therefore the bounce/complaint webhook flow does **not** introduce a new processing purpose, processor, or data category — `/privacy` is unchanged.

## 11. Audit-log delta (restated from Appendix A + E45 reconciliation question)

Per Appendix A, the send-invites endpoint writes one `audit_log` row per recipient:

| Column | Value |
|---|---|
| `action` | `'test_invite_sent'` |
| `actor_id` | authenticated author's `auth.users.id` |
| `target_type` | `'tests'` |
| `target_id` | the `tests.id` |
| `pii_access` | `true` (recipient email is PII processed) |
| `details` | `{ "recipient_email_hash": "<sha256-hex>", "resend_message_id": "<uuid>", "include_password": <bool>, "status": "sent" }` |

The `recipient_email_hash` is a **one-way SHA-256** of the lowercased + trimmed email address. **No salt** — we want hash equality to be deterministic across sessions so the author can later look up "did I email this address?" (Phase 5+ "resend to bounced" feature).

**Reconciliation question** (re-stated from the prompt): when the author wants to "resend to bounced recipients" in Phase 5+, how do they retrieve the original email from the audit row?

**Answer: they don't.** The audit row stores only the hash. The Phase 5+ "resend to bounced" feature requires the author to **re-paste the recipient list from their own records**, at which point the UI hashes each pasted address and intersects with audit rows where `status='bounced'` — the intersection set is what gets re-sent. This keeps the platform's invariant that we never store recipient plaintext beyond the in-flight 30-second Resend API call window.

**Implementation contract (for E45.14):**

```ts
// In send-invites.ts, per recipient:
const emailHash = await sha256Hex(recipientEmail.trim().toLowerCase());
// 1. Insert audit row with status='pending', email_hash, resend_message_id=null
// 2. Call sendEmail() → get { ok, id }
// 3. Update audit row: status='sent', resend_message_id=id (on ok=true)
//    OR status='failed', error=<reason> (on ok=false)
// 4. Resend webhook later updates status='bounced' | 'complained'
```

The two-step (pending → sent) write satisfies R6 (Resend send failure leaves orphaned audit rows) — the row exists before the send so we never lose visibility, and the post-send update closes the loop.

## 12. Cross-references

- E11 email runbook (`tasks/E11-email-runbook.md`) — base infrastructure; Phase 3 extends it with the invite path + webhook endpoint.
- E45 PLAN (`tasks/PLAN-2026-05-21-E45-test-detail-editor.md`) — Decisions D6, D7; Risks R3, R6; Phase 3 stories E45.13–E45.17.
- E45 Appendix A — audit-log schema + brute-force model (this appendix re-uses the `audit_log` row shape).
- `/privacy` section s4 (i18n keys `s4.resend_label`, `s4.resend_text`) — Resend disclosure; unchanged for E45.
- `functions/_lib/email.ts` + `functions/_lib/email-templates.ts` — touch-points for E45.13.
