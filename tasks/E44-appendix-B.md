# E44 — Appendix B: Legal — CC BY 4.0 submission consent + `/privacy` deltas

**Status:** Draft, ready for Phase B implementation (consent dialog) and Phase D application (`/privacy` text + `CONSENT_VERSION` bump).
**Author:** Claude (research subagent, `legal:review-contract` methodology).
**Reviewer:** PO / am.bonum s.r.o. statutory body before Phase D merge.
**Scope:** Legal evaluation of the user-template public submission flow defined in `tasks/PLAN-2026-05-20-E44-template-marketplace.md` Decision D3. Companion to Appendices A (SEO/marketing), C (AI moderation), D (UX/a11y).
**Boundary:** This appendix is **English** per CLAUDE.md. Slovak appears only in verbatim UI/privacy strings, quoted in code-fence blocks. **No code is edited by this document — deltas are quoted, ready for the future Phase B and Phase D agents to apply.**

> **Not legal advice.** This is contract-review analysis for engineering planning. A qualified Slovak lawyer should sign off the verbatim consent text and `/privacy` deltas before Phase D ships.

---

## 1. GDPR role analysis — who is what, on what basis

When a user (the **author**) clicks "Odoslať na zverejnenie" on their own template, three distinct data-processing acts happen on the subenai platform. Each has its own role, basis, and `/privacy` anchor.

### 1.1 Three acts, three roles

| Act | Who is subenai (am.bonum s.r.o.) | Personal data involved |
|---|---|---|
| **A. Storage of the submission row** (`template_submissions` table — author user-id, draft snapshot, age-rating self-declaration, AI precheck verdict) | **Controller** (Art. 4(7) GDPR) — purposes and means are set by the platform | author's user-id (FK to `auth.users`) + draft content |
| **B. Publication of the approved template** on `/sablony/$slug` with author display-name attribution (D3) | **Controller** of the publication metadata (`author_display_name`, `published_at`, slug, JSON-LD) | author's chosen display name + the fact that they authored the template |
| **C. Distribution of the template body** to the public (anyone who views, copies, forks the questions list) under CC BY 4.0 | **Hosting service provider** (DSA Art. 4) + **publisher of a CC-licensed work** on behalf of the author. NOT a processor in the GDPR sense — the template body is not personal data once attribution is decoupled from author identity. | none (the template body is `question_ids[]` and Slovak free-text — author has self-declared no personal data) |

### 1.2 Legal bases — Art. 6(1) GDPR

- **Act A (storage of submission):** Art. 6(1)(b) — performance of a contract (the Terms of Service plus the author's use of `/app/templates`). Submission is a feature the user actively invoked; processing is necessary to evaluate it.
- **Act B (publication-as-public-act):** Art. 6(1)(a) — **explicit consent**, captured at submission time via the consent dialog in § 3 below. Reason: publication is **not necessary** for the user's enjoyment of subenai (they can keep the template private). Publication is a separate, voluntary, severable purpose, so Art. 6(1)(b) does not cover it; consent is the only honest basis. Aligns with EDPB Guidelines 5/2020 on consent §40-41.
- **Act C (CC BY 4.0 distribution to public):** copyright-law act, not GDPR. The author grants subenai (and the world) a CC BY 4.0 license. GDPR re-enters only at the point of attribution = personal data (display name), already covered by Act B's consent.

### 1.3 Existing `/privacy` anchors this links into

Reading `src/i18n/locales/sk/legal.json`:

- **§ s3 "Účel a právny základ spracúvania"** — the new row goes here (see § 4.1 below).
- **§ s4 "Príjemcovia a sprostredkovatelia"** — no new processor added (the template body lives in the existing Supabase row; CDN delivery via Cloudflare is already disclosed). Confirmed in § 4.3 below.
- **§ s5 "Tvoje práva"** — existing rights text covers Art. 15-22 generically; the new Act-B publication adds a nuance to Art. 17 erasure (irrevocability for already-distributed forks). Added paragraph in § 4.2 below.

### 1.4 GDPR Art. 13 notice — already discharged

The existing `/privacy` page is reachable from the consent dialog (link in the "Detail" expander, § 3.2 below). No standalone Art. 13 popup is needed at submission — the dialog itself surfaces the material facts (recipient = the public, basis = consent, retention = indefinite for distributed copies) and links to the full policy.

---

## 2. CC BY 4.0 mechanics — what the user grants, retains, and accepts

This subsection is what the author needs to understand **before** they tick the consent box. The Slovak verbatim summary in § 3.3 distills it; this English text is the legal substance behind the Slovak words.

### 2.1 What the user grants (CC BY 4.0 §2(a))

A **worldwide, royalty-free, non-sublicensable, non-exclusive, irrevocable** license to:

1. Reproduce and share the licensed material in any medium.
2. Produce, reproduce, and share adapted material (derivative works / forks).

The grant covers copyright and "Similar Rights" (Slovak: *autorské právo a práva príbuzné*) per CC BY 4.0 §1(l). Sui generis database rights (Slovak Act 185/2015 §131) are covered by §4 of the license; given templates are creative compilations of questions, not databases in the technical sense, §4 is largely redundant here but harmless.

### 2.2 What the user retains

- **Authorship** (autorstvo, the moral right). Slovak copyright recognises *osobnostné práva* in §17 of Act 185/2015 Z.z. — these are inalienable; CC BY 4.0 does **not** purport to waive them (the license explicitly carves out moral rights in §2(b)(2): "Moral rights, such as the right of integrity, are not licensed under this Public License").
- **Copyright** — the author remains the copyright holder. CC BY 4.0 is a license, not an assignment.
- **The right to dual-license** — the author can offer the same template under a commercial license elsewhere. CC BY 4.0 is non-exclusive (§2(a)(2)).
- **The right to remove the template from subenai's own surfaces** under GDPR Art. 17 (see § 7.3 edge case).

### 2.3 What attribution looks like in practice

Per CC BY 4.0 §3(a)(1), licensees of the template (i.e. anyone forking it) must retain:

- Identification of the creator (the author display name + optional URI).
- A copyright notice (auto-generated: "© [year] [author_display_name]").
- A notice referring to CC BY 4.0 with a URI to the license deed (`https://creativecommons.org/licenses/by/4.0/`).
- A notice referring to disclaimer of warranties.
- A URI or hyperlink to the original (`https://subenai.sk/sablony/$slug`).
- Indication of any modifications.

In subenai's UI this renders on every public template card and on `/sablony/$slug` (Q1 in PLAN open questions answered: yes on both). Sample: see § 3.4.

### 2.4 Why CC BY 4.0 (vs CC0, vs proprietary)

| Option | Why rejected | Why CC BY 4.0 wins |
|---|---|---|
| **CC0** (public domain dedication) | Strips author attribution. Slovak moral-rights regime (osobnostné práva, §17 Act 185/2015) is inalienable, so a Slovak author cannot fully waive authorship. CC0 is functionally weaker for Slovak authors than its theory suggests. Also: removes the marketing value of "templates by community member X". | — |
| **Proprietary platform license** ("by submitting you grant am.bonum a perpetual sublicensable license") | Concentrates rights at the platform. Bad PR; aligned with bad actors. EU consumer-law headwinds — Slovak § 53 Občianskeho zákonníka invalidates standard-form clauses that significantly disadvantage the consumer; broad IP grants are a known target. | — |
| **CC BY-NC** (non-commercial) | Templates would not be usable by paid HR or commercial education contexts, which is a primary use case for subenai (D2 of the plan: "marketing surface"). NC's "non-commercial" is also famously ill-defined and litigation-prone. | — |
| **CC BY-SA** (share-alike, copyleft) | Forces every fork to be CC BY-SA, which is incompatible with importing into closed commercial test platforms. Friction for the marketing use case. | — |
| **CC BY 4.0** | — | Author retains copyright; attribution is mandatory; commercial use allowed; international (Creative Commons 4.0 series was drafted specifically for international interoperability — §8 of the deed). Battle-tested for user-generated platforms (Wikipedia uses CC BY-SA, OpenStreetMap moved to ODbL, Stack Overflow uses CC BY-SA — CC BY 4.0 is the most permissive in the family and most aligned with our "marketing reach" goal). |

### 2.5 Irrevocability — the load-bearing clause

**CC BY 4.0 §2(a)(1)** uses the word **irrevocable**. **§6(a)** says the license "applies for the term of the Copyright and Similar Rights licensed here". This means:

- Once a third party has obtained a copy of a published template under CC BY 4.0 (e.g. forked it into their own test, downloaded it, mirrored it), **the author cannot retract that copy's license**. The fork is free to continue distributing it per CC BY 4.0 terms, attribution preserved.
- The author **can** request that subenai itself take down the public copy on `/sablony/$slug` — that is a GDPR Art. 17 right against the **controller**, not against the world. See § 7.3.

This is non-negotiable under the standard CC BY 4.0 wording. We do not modify the license (modifications would forfeit the right to call it "CC BY 4.0" per CC trademark policy). The Slovak consent dialog must surface this clearly — see § 3.2.

### 2.6 Methodology check — CC BY 4.0 § review against the playbook

Applying `legal:review-contract` clause-tier analysis to CC BY 4.0 as a contract between author (licensor) and the world (licensee), with subenai as the platform-publisher:

| Clause | CC BY 4.0 § | Tier | Notes |
|---|---|---|---|
| Grant of license | §2(a) | GREEN | Standard CC text; well-litigated globally. |
| Attribution requirements | §3(a) | GREEN | Clear, machine-renderable; aligns with our UI plan (§ 3.4). |
| Disclaimer of warranties | §5(a) | GREEN | "As-is, no warranties" — protects the author (and incidentally us, on the marketing-reach side, since we publish the work as-licensed). |
| Limitation of liability | §5(b) | GREEN | Author has no liability to downstream users. Mirrored on subenai's side by ToS limitation. |
| Termination | §6(b) | GREEN-YELLOW | Auto-terminates licensee's rights on material breach; reinstates if cured within 30 days. We don't enforce this — downstream is each licensee's problem. Yellow note: subenai itself complies trivially (we display attribution always). |
| Other terms | §7 | GREEN | "No additional terms imposed by Licensor are binding unless agreed" — important: we cannot bolt extra obligations onto the CC BY 4.0 grant via our ToS; if we want extra obligations from forkers we'd need a separate platform-ToS clause, which we do not. |
| Interpretation | §8 | GREEN | International, severability, no waiver. |

**No RED flags in the license itself.** Risk register (§ 8) addresses the *platform* risks: improper consent, takedown gaps, copyright complaints from third parties whose work the author lifted.

---

## 3. Verbatim Slovak consent text for the submission dialog

These strings ship in `src/i18n/locales/sk/tests.json` under `templates.submission.*` in Phase B (story E44.8). Quoted here verbatim — Phase B agent copies them into the JSON file without editing.

### 3.1 `submission_consent_checkbox_label` (≤ 200 chars, GDPR Art. 7(2) requires distinct, clear language)

```
Súhlasím so zverejnením tejto šablóny pod licenciou Creative Commons CC BY 4.0 (autorstvo si ponechávam) a chápem, že už raz zverejnenú kópiu nemožno odvolať z rúk používateľov, ktorí si ju stiahli alebo forkli.
```

Char count: 198. Two propositions in one sentence; the second clause is the irrevocability disclosure required by transparency (Art. 12 GDPR + § 53 ods. 1 Občianskeho zákonníka — clear and intelligible form for consumer agreements).

### 3.2 `submission_consent_details_heading`

```
Detail: čo presne tým dávaš
```

### 3.3 `submission_consent_details_body` (~150 words)

```
Kliknutím na "Odoslať na zverejnenie" udeľuješ verejnosti licenciu Creative Commons CC BY 4.0 na tvoju šablónu (https://creativecommons.org/licenses/by/4.0/deed.sk). Konkrétne: ktokoľvek si ju môže pozrieť, použiť, upraviť, šíriť aj komerčne — povinný je iba uviesť teba ako autora a odkaz na pôvodnú stránku. Autorstvo a osobnostné práva podľa § 17 zákona č. 185/2015 Z. z. ti zostávajú; licenciu udeľuješ navyše k svojmu vlastníctvu, nepredávaš ho. Túto licenciu nemožno odvolať pre kópie, ktoré si už niekto stiahol alebo forkol — to je súčasťou definície CC BY 4.0. Verejnú kópiu na subenai.sk vieme odstrániť na základe tvojej žiadosti (GDPR čl. 17), ale nedokážeme stiahnuť kópie z internetu. Pred zverejnením tvoju šablónu automaticky skontroluje AI moderátor a manuálne schváli administrátor — toto trvá zvyčajne menej než 24 hodín. Plné podmienky: /privacy.
```

Word count: ~145. Covers: license name + link to Slovak deed; permitted uses; preserved moral rights with statutory cite; non-exclusive (additive) nature; irrevocability scoped correctly (distributed copies, not the subenai public copy); GDPR Art. 17 carve-back; the AI + admin moderation step (transparency, EDPB Guidelines on automated decision-making — though this is not Art. 22 territory, see § 1).

### 3.4 `submission_attribution_preview` — sample rendering on the public template card

A read-only preview shown inside the consent dialog so the author sees exactly how attribution will display. UI string + the rendered element:

```
Takto bude tvoja šablóna podpísaná na verejnej stránke:
```

Followed by an actual preview block (Slovak labels, dynamic values in `{}` are filled at runtime from the user's profile + submission row):

```
{Author display name} · CC BY 4.0 · subenai.sk/sablony/{slug}
Zverejnené {published_at}
```

Rendered example with concrete values:

```
Mária Kováčová · CC BY 4.0 · subenai.sk/sablony/onboarding-kolegov-x7k2qp
Zverejnené 25. mája 2026
```

This satisfies CC BY 4.0 §3(a)(1) requirements: creator identification (display name), license + version (CC BY 4.0), link to original (subenai URL). The standard "© year author" copyright notice is not required by §3(a)(1) when the work is licensed under CC, but we include the "Zverejnené" line as a `dateModified` analog (also used by the JSON-LD `CreativeWork` schema in Appendix A).

---

## 4. `/privacy` delta — verbatim Slovak paragraphs to add

These go into `src/i18n/locales/sk/legal.json` (and CS/EN locales as faithful translations). **Do not edit `/privacy` until Phase D (story E44.16).** Quoted here ready to paste.

### 4.1 New row in § s3 "Účel a právny základ spracúvania"

Add under `privacy.s3.rows` (between `composer` and `edu`, in the order the table currently presents user-feature processing):

```json
"template_publication": {
  "purpose": "Verejné zverejnenie tvojej šablóny v knižnici /sablony (autorský obsah pod licenciou Creative Commons CC BY 4.0, s tvojím zobrazovaným menom ako autorstvom)",
  "basis": "Súhlas / čl. 6 ods. 1 písm. a GDPR (zverejnenie) + plnenie zmluvy / čl. 6 ods. 1 písm. b GDPR (uloženie tvojej odoslanej šablóny pred schválením)",
  "retention": "Verejná kópia: bez časového obmedzenia, kým ju ty alebo administrátor neodstránite. Tvoje zobrazované meno môžeš zmeniť alebo nahradiť „Anonym\" cez svoj profil. Distribuované kópie (ktoré si niekto stiahol alebo forkol) sa riadia podmienkami CC BY 4.0 a nemožno ich odvolať — tak to definuje samotná licencia."
}
```

### 4.2 New paragraph in § s5 "Tvoje práva", appended after the existing `retention_suffix`:

```json
"template_takedown_label": "Odstránenie zverejnenej šablóny:",
"template_takedown_text": " ak si svoju šablónu zverejnil v knižnici /sablony a chceš ju stiahnuť, napíš nám na support@subenai.sk. Verejnú kópiu na subenai.sk odstránime do 30 dní (čl. 17 ods. 1 GDPR). Pozor: licencia Creative Commons CC BY 4.0, ktorú si pri zverejnení udelil, je pre už distribuované kópie neodvolateľná — komukoľvek, kto si tvoju šablónu už predtým stiahol alebo forkol, ostáva jeho kópia v platnosti aj po odstránení z našej stránky. Vieme odstrániť len to, čo hostíme my. Ak chceš, aby sa pri zostávajúcich kópiách neuvádzalo tvoje meno, môžeme tvoje zobrazované meno v atribúcii nahradiť hodnotou „Anonym\" — toto sa propaguje cez naše JSON-LD, ale nezaviaže to forkov mimo subenai.sk."
```

### 4.3 Recipients (§ s4) — no addition

Per § 1.1 Act C analysis: the template body is hosted on the existing Supabase row and delivered via the existing Cloudflare CDN. No new processor. The DSA-perspective designation of subenai as "hosting service provider" for user-generated templates is a regulatory category, not a GDPR recipient, so does not belong in § s4. **No delta to `recipients_*` keys.**

### 4.4 Education-mode / sponsorship sections — no addition

Template publication is unrelated to edu mode (§ s8) or sponsorship (§ s7). No deltas to those sections.

---

## 5. `/cookies` delta — confirmed: none

Publication acts (submission, AI precheck, admin moderation, public render) **do not** set, read, or rely on any cookies / localStorage / sessionStorage / IndexedDB key beyond what is already disclosed:

- Submission writes a row to Supabase via the existing authenticated session cookie (already covered under the `necessary` category in `/cookies`).
- AI precheck runs server-side in a CF Pages Function — no client storage.
- Admin moderation happens in the existing `/admin` shell — no new client storage.
- Public render of `/sablony` and `/sablony/$slug` reads nothing on the client beyond the existing analytics opt-in (already disclosed).

The OG-card / SEO surface (Appendix A) uses no client storage either — JSON-LD is server-rendered.

**Conclusion: `/cookies` deltas = nil.** No new category, no new key, no new vendor. Confirmed.

---

## 6. `CONSENT_VERSION` analysis

### 6.1 When to bump (and not bump)

Per `src/lib/consent.ts` comment: bump when categories, processing purposes, or third-party recipients listed in `/cookies` and `/privacy` change "in a way that affects the user's previous decision".

Of the four E44 phases:

| Phase | Adds purpose in `/privacy`? | Adds recipient? | New cookie category? | Bump? |
|---|---|---|---|---|
| A — Schema + private CRUD | No (private CRUD is just a write into the existing `templates` table; the existing s3 "Vlastné zostavy testov" row covers private template data already, semantically equivalent) | No | No | **No** — confirms D9 in the plan. |
| B — AI precheck + submission | The submission row stores author user-id + draft; arguably new purpose, but the row is **private to the submitting user + admins** until publication. Treat as an internal step. | Anthropic API call from CF Function is a new processor (we send Slovak template text to Claude Haiku) | No | **Borderline.** If we treat the Anthropic API call as a new processor (it is, factually), then s4 needs an Anthropic entry and a bump is warranted **at Phase B**. **Recommendation:** add the Anthropic entry in Phase B's `/privacy` delta and bump there too — but plan D9 explicitly says "single bump deferred to Phase D". Resolution: bump once at Phase D, but the Phase B s4 Anthropic addition must land **alongside** the Phase D s3 addition in the same migration so that the bump covers both. **Phase B agent must NOT bump independently.** |
| C — Admin queue + notifications | No (admin-internal) | No | No | **No** — D9 holds. |
| D — Public gallery + privacy | Yes (new s3 row from § 4.1) | Yes (Anthropic, deferred from B) | No | **Yes — single bump, here.** |

### 6.2 New `CONSENT_VERSION` value

Current: `1.6.0` (set by E40 for preferences-category change).

Phase D bump: **`1.7.0`** — minor version because it adds a new purpose + new processor disclosure, no breaking change to categories. Set in the same commit that lands the `/privacy` and `/cookies` text deltas.

### 6.3 Banner one-liner (verbatim Slovak, shown in the re-prompt banner)

Add to `src/i18n/locales/sk/legal.json` under the consent-banner namespace (whatever the existing key for "what changed" is — the Phase D agent will locate it):

```
Doplnili sme zásady ochrany súkromia: používatelia môžu od dnes zverejňovať svoje šablóny v knižnici /sablony pod licenciou Creative Commons CC BY 4.0 a my využívame Claude Haiku od spoločnosti Anthropic na automatickú kontrolu obsahu pred zverejnením. Pozri si /privacy a vyber kategórie znova.
```

Two facts (publication + Anthropic processor), one ask (re-pick categories). Short enough for the banner; full detail at `/privacy`.

### 6.4 What re-shows because of the bump

The cookie/storage banner. Existing users will see it on next visit; they must re-pick analytics / marketing / preferences. The submission consent in § 3 is **a separate, per-submission consent** (Art. 7(2) granularity) — it is not bundled into the cookie banner. A user who clicks "Reject all" on the cookie banner can still submit a template; they just won't see analytics.

---

## 7. Edge cases

### 7.1 Author deletes their subenai account after publishing a template

Behaviour per D3 + D5 + § 2.2 + plan Appendix B brief:

1. `auth.users` row deletion cascades via the `template_submissions.author_id` FK if `ON DELETE CASCADE` is set; on the public `templates` row we set `owner_id` to NULL via `ON DELETE SET NULL` (matches the `fork_of` pattern in PLAN § E44.1 DDL).
2. The `author_display_name` column on the public `templates` row is a **snapshot** (per PLAN line 21) — it survives the account deletion by design. We **replace** it with the literal string `"Anonym (autor odstránil účet)"` via a trigger that fires on `auth.users` deletion when a public `templates` row references it.
3. The template **stays public** because CC BY 4.0 was already granted and the public's right to the template body is detached from the author's continued existence on the platform.
4. JSON-LD on `/sablony/$slug` updates to `"author": { "@type": "Person", "name": "Anonym (autor odstránil účet)" }` on next render; cards re-render the new name within the SSR cache TTL.
5. Forks already taken keep the original name (CC BY 4.0 §3(a)(1) — attribution as supplied at the time of distribution). We do not chase forks.

**Privacy posture:** Account deletion **honours GDPR Art. 17** for everything subenai controls (the user-id link, the historical attribution). It does **not** retract the CC BY 4.0 license — same logic as § 7.3.

**Verbatim public-card string** (add to i18n `templates.attribution.anonymized`):
```
Anonym (autor odstránil účet)
```

### 7.2 Author edits a published template

Per PLAN Scope-Out "Live AI precheck rerun on edit" + D10: **re-edit = re-submit** (resets `status` to `draft`, drops back to `private` visibility, requires fresh consent + new AI precheck + admin approval).

**Why this is legally cleaner:**
- Each publication = a discrete CC BY 4.0 grant on a specific version of the work. CC BY 4.0 §6(a) ties the license to the licensed material as it exists; an edited template is, strictly, a new work derived from the old one.
- AI moderation contracts on a snapshot. If we let edits live-mutate the public copy, the AI verdict on file becomes stale and meaningless; admin would have to re-review without realizing it.
- Slovak consumer-law angle (§ 53 OZ): "súhlas musí byť slobodný, vážny a určitý" — consent given on version N cannot reasonably be assumed to extend to version N+1 with materially different content.

**UI consequence:** the "Upraviť" action on a `visibility='public', status='published'` template that the user owns produces a confirmation: *"Úpravou tejto šablóny ju stiahneš z verejnej knižnice. Po dokončení úprav ju môžeš znova odoslať na zverejnenie — prejde opäť AI kontrolou a admin schválením."* (Phase B i18n string.)

Forks already taken from the old version keep the old version; CC BY 4.0 §3(b) "indicate if You modified the licensed material" applies to whoever further forks the new version.

### 7.3 Author wants to revoke a published template (without deleting account)

Distinguish two requests:

| Request | What we can do | What we cannot do |
|---|---|---|
| **"Stiahnite moju šablónu z `/sablony`"** (= GDPR Art. 17 erasure against subenai as controller of the publication) | Yes — soft-set `visibility='private', status='draft'`, hard-delete the slug row from sitemap, 410 the slug URL for 90 days (SEO removal), purge OG card from Cloudflare cache. Done within 30 days. | — |
| **"Stiahnite moju šablónu zo všetkých internetových kópií"** | — | We cannot. CC BY 4.0 §2(a)(1) "irrevocable" applies to distributed copies. Forks already taken are out of subenai's reach by design. |
| **"Odstráňte moje meno z atribúcie u forkov"** | Best effort — we publish a `noindex` "anonymizovaný autor" record at the original slug; that may propagate via JSON-LD updates if forkers re-render. Many will not. | We have no enforcement mechanism over third-party forkers. |

The privacy text in § 4.2 above is the user-facing version of this distinction.

### 7.4 Copyright complaints (DMCA / Slovak takedown)

A third party (e.g. a copyright holder whose questions were lifted into a template) claims a published template infringes their copyright.

**Legal framework:**
- **EU:** Digital Services Act (Regulation (EU) 2022/2065) Art. 16 "notice and action" — subenai as a hosting service must provide a mechanism for notifications, act expeditiously on properly-substantiated notices. Slovak transposition: act č. 109/2025 Z. z. (DSA implementing legislation, in force from 2026).
- **DMCA (US):** strictly speaking does not bind subenai (am.bonum is Slovak), but US-based forkers may invoke it. We treat DMCA notices as DSA Art. 16 notices for processing purposes — same workflow.

**Process** (proposed; Phase D ships the public-facing version on `/privacy` + a `/legal/takedown` route stub):

1. Complainant sends notice to **`support@subenai.sk`** — the canonical address used everywhere else in `/privacy` and `/app-shell`. Confirmed via grep: `support@subenai.sk` is the only legal-correspondence address in the codebase; we do not introduce a `dpo@` or `legal@` mailbox just for this (single-mailbox model is simpler for a small company and is consistent with the existing § s1 "Kontakt vo veciach ochrany osobných údajov" pattern).
2. Notice must contain (per DSA Art. 16(2)): explanation of why the content is illegal, exact URL (`/sablony/$slug`), identification of the complainant + contact details, statement of good faith, electronic signature.
3. Admin (=statutory body or designated reviewer) acknowledges within 5 business days, decides within 14 days. Action is one of: keep, take down, take down + counter-notify the author.
4. Author is notified (in-app notification + email) of any take-down decision, with grounds and right to counter-notify.
5. Action is logged in `audit_log` with `action='template_takedown'` and the notice reference.

**Verbatim addition** to `/privacy` (proposed for Phase D, separate from the s3 row — goes as a new section s11 or appended to s5):

```json
"copyright_takedown_label": "Sťažnosti na porušenie autorských práv:",
"copyright_takedown_text": " ak si držiteľ autorských práv a domnievaš sa, že niektorá verejná šablóna v /sablony porušuje tvoje práva, napíš nám na support@subenai.sk s presnou URL šablóny, dôvodom protiprávnosti a tvojimi kontaktnými údajmi (požiadavky čl. 16 nariadenia EÚ 2022/2065 o digitálnych službách). Prijatie potvrdíme do 5 pracovných dní a rozhodneme do 14 dní. O výsledku (ponechanie / odstránenie) informujeme aj autora šablóny, ktorý má právo podať protiopatrenie."
```

---

## 8. Risk register — what's not yet mitigated

| ID | Risk | Severity (S/M/L) | Mitigation |
|---|---|---|---|
| R-B1 | **Author uploads a template containing copyrighted questions** (e.g. lifted from a published textbook) without owning the rights. CC BY 4.0 only binds the author's rights — they cannot license what they do not own. subenai becomes the publisher of infringing material. | **L** (high frequency in UGC platforms; reputational + legal) | (1) Submission consent dialog adds a **second checkbox** (Phase B): *"Potvrdzujem, že som autor tejto šablóny alebo mám oprávnenie ju zverejniť pod licenciou CC BY 4.0."* — shifts liability to the author per CC BY 4.0 §5(a) "as-is" + adds Slovak Občiansky zákonník §420 negligence basis for recourse. (2) AI precheck (Appendix C) includes `copyright_red_flags` heuristic — direct-quote detection from known sources. (3) DSA Art. 16 takedown process (§ 7.4). |
| R-B2 | **Slovak consumer-law challenge to the standard-form consent** — § 53 ods. 1 OZ invalidates unfair standard-form clauses. If consent text is too dense or the "irrevocable" wording is too buried, a consumer protection authority could rule the consent invalid and order us to retract published templates. | **M** | (1) Consent dialog uses a **single, visible** checkbox with the irrevocability disclosure in the label itself (§ 3.1), not buried in a 50-page ToS. (2) "Detail" expander is one paragraph, not a wall of text (§ 3.3). (3) Slovak-language deed link (`creativecommons.org/licenses/by/4.0/deed.sk`) — the user can read the actual license in Slovak. |
| R-B3 | **GDPR Art. 22 challenge** if a user argues the AI precheck is a "decision based solely on automated processing" that produces legal or similarly significant effects. | **S** | Decision is **AI-suggests, admin-decides** per D2 + Phase C. Final approve/reject is always human (admin). Art. 22 does not apply. We surface this in the submission UI (Phase B copy): *"Pred zverejnením tvoju šablónu automaticky skontroluje AI moderátor a manuálne schváli administrátor."* (already in § 3.3). |
| R-B4 | **Author-account deletion racing with template publication** — if account deletion fires between AI precheck completion and admin approval, the `author_id` becomes NULL on the `template_submissions` row and the queue item shows an orphaned submission. Admin might approve it anyway, publishing a template with no author identity. | **S** | (1) DB constraint: `template_submissions.author_id NOT NULL` + `ON DELETE CASCADE` — if author deletes, the submission row is deleted (cannot be approved post-delete). (2) On public `templates` rows with `author_display_name` snapshot, the cascade only NULLs `owner_id`; `author_display_name` survives, so already-published templates are unaffected. |
| R-B5 | **Forks of a template that contained the author's personal data** (e.g. author wrote their own phone number into a free-text question by mistake) — CC BY 4.0 cannot retract the fork; GDPR Art. 17 cannot reach the forker. | **M** | (1) AI precheck (Appendix C) adds a **PII-scan** dimension: detect phone numbers, emails, IDs in free-text question fields and either reject or hold for admin review. (2) Submission consent dialog includes a tip in the "Detail" body: *"Skontroluj, či v otázkach nie sú tvoje osobné údaje — meno respondenta, telefón, e-mail. Po zverejnení sa nedajú stiahnuť z forkov."* (proposed Phase B addition to § 3.3 body if length budget allows; currently at 145 words, has ~50 words headroom). |

---

## 9. Phase ownership — who applies what, when

| Verbatim string / decision | Lands in | Phase | Story |
|---|---|---|---|
| § 3.1 checkbox label | `tests.json#templates.submission.consent_checkbox_label` | B | E44.8 |
| § 3.2 details heading | `tests.json#templates.submission.consent_details_heading` | B | E44.8 |
| § 3.3 details body | `tests.json#templates.submission.consent_details_body` | B | E44.8 |
| § 3.4 attribution preview | `tests.json#templates.submission.attribution_preview` + component | B | E44.8 |
| § 4.1 s3 row | `legal.json#privacy.s3.rows.template_publication` | D | E44.16 |
| § 4.2 s5 takedown paragraph | `legal.json#privacy.s5.template_takedown_*` | D | E44.16 |
| § 6.2 `CONSENT_VERSION = "1.7.0"` | `src/lib/consent.ts` | D | E44.16 |
| § 6.3 banner one-liner | `legal.json` (banner namespace) | D | E44.16 |
| § 7.1 anonymized attribution string | `tests.json#templates.attribution.anonymized` + DB trigger | B (string) + C (trigger) | E44.6 trigger, E44.8 string |
| § 7.2 edit-confirmation copy | `tests.json#templates.submission.edit_will_unpublish` | B | E44.8 |
| § 7.4 copyright takedown text + workflow | `legal.json` + admin runbook | D | E44.16 + new doc `tasks/E44-takedown-runbook.md` |
| § 8 R-B1 second consent checkbox | `tests.json#templates.submission.ownership_checkbox_label` | B | E44.8 |

---

## 10. Sign-off checklist (for the human reviewer before Phase D merge)

- [ ] § 3.1 checkbox label reviewed by Slovak lawyer for §53 OZ compliance.
- [ ] § 3.3 body reviewed for GDPR Art. 7 + Art. 12 transparency.
- [ ] § 4.1 / § 4.2 / § 7.4 `/privacy` text reviewed by Slovak lawyer.
- [ ] § 6.2 `CONSENT_VERSION` bump confirmed; banner one-liner approved.
- [ ] § 7.4 takedown email = `support@subenai.sk` confirmed as the canonical address (matches `src/i18n/locales/sk/app-shell.json` + `legal.json` pattern).
- [ ] § 8 R-B1 ownership checkbox approved as a separate, granular consent per Art. 7(2).
- [ ] CHANGELOG entry for E44 epic close mentions: "verejné šablóny pod CC BY 4.0, nová sekcia v zásadách ochrany súkromia, AI moderátor Claude Haiku".
- [ ] Sitemap excludes pre-publication slugs (only `visibility='public', status='published'`).

— end of Appendix B —
