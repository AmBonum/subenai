# E53 — AI scam-check chat assistant ("Podvodový poradca")

**Status:** 🟡 Plan drafted, awaiting product-owner approval
**Branch (future):** `feature/E53-scam-chat`
**Author:** architecture plan, 2026-06-13 (no implementation in this commit)

---

## Goal

A Slovak-language chat assistant embedded in subenai.sk that:

1. talks **only** about fraud/scams ("podvody") and the app's own content
   — any other topic gets a polite Slovak refusal, enforced by layered
   classification, not by prompt vibes;
2. answers grounded in the whole site corpus (81 academy articles in
   `src/content/blog/*.mdx`, the course catalog in `src/content/courses/`
   — count is canonical via `COURSE_COUNT` in `src/content/claims.ts` —
   the industry test packs, and the public legal pages) via RAG;
3. runs a **scam triage flow**: the user describes a situation ("bol som
   podvedený?" / "snaží sa ma niekto podviesť?"), optionally attaches up
   to 5 photos (5 MB each), gets a structured risk assessment, and — when
   fraud is likely — a recommendation to contact the police plus a
   **formatted PDF summary** (timeline, indicators, evidence list,
   recommended next steps) they can take to the police;
4. helps with site navigation ("kde si nastavím X") with **role-aware
   disclosure** — anonymous users learn nothing about signed-in
   functionality, and admin functionality is never discussed with anyone;
5. runs **server-side within the existing Cloudflare Pages free tier**,
   with hard caps that fail closed before any paid usage is possible.

On "bezplatný, ideálne lokálne natrénovaný" (free, ideally locally
trained) — honest interpretation: training or self-hosting a custom model
is not possible on Pages free tier (no GPU, no persistent compute) and
not justified by the corpus size. The closest honest equivalent is
**Cloudflare Workers AI** open-weight models (Meta Llama family + BAAI
embeddings) on the **Workers Free allocation of 10,000 neurons/day** —
$0 spend, models hosted in Cloudflare's edge, no third-party AI vendor
added beyond Cloudflare itself (already our processor as host). The
feasibility numbers are in § Cost. The repo's existing Anthropic Haiku
client (`functions/_lib/anthropic.ts`, used by the E44 template precheck)
remains available as a *paid* quality fallback if the owner later decides
Slovak fluency on open 8B/70B models is insufficient — explicitly **not**
part of this epic's scope.

## Non-goals

- No general-purpose chatbot. Off-topic capability is a bug, not a
  feature.
- No persistence of chat transcripts, photos, or triage results on the
  server. The PDF lives on the user's device only.
- No legal advice. The assistant assesses scam likelihood and produces a
  factual summary; it never claims to determine criminal liability. The
  PDF carries a disclaimer.
- No paid AI usage. When the free budget is exhausted the feature
  degrades politely; it never silently bills.
- No admin-facing chat features and no admin knowledge in the corpus.
- No fine-tuning / "local training" of models (see Goal).
- No human handoff / live support — that is E48 ticketing
  (`/contact-form`), which the assistant may *link to*.

---

## Architecture

```
┌────────────────────────── Browser ───────────────────────────┐
│ Chat widget (floating launcher + /pomocnik route)            │
│  · history kept in React state only (dies with the tab)      │
│  · photos: client-side downscale (canvas → JPEG ≤1600px)     │
│  · originals NEVER uploaded; full-res stays local            │
│  · police-report PDF rendered CLIENT-SIDE                    │
│    (@react-pdf/renderer, lazy chunk — same pattern as        │
│     src/lib/dpa/render.client.ts)                            │
└───────┬──────────────────────────────────────────────────────┘
        │ POST /api/scam-chat        (message + bounded history)
        │ POST /api/scam-chat/photo  (1 downscaled image / call)
        │ Authorization: Bearer <supabase JWT>   (optional)
        ▼
┌────────────── CF Pages Function (functions/api/scam-chat/) ──┐
│ 1 Turnstile (first message) + per-IP rate limit + daily      │
│   quotas + neuron ledger — KV  (functions/_lib/security.ts)  │
│ 2 Role resolution: anon | user  (supabase.auth.getUser,      │
│   pattern: functions/api/support-attachment-upload.ts)       │
│ 3 INPUT GATE: topic classifier (small Llama) +               │
│   @cf/meta/llama-guard-3-8b safety classification            │
│ 4 RAG: @cf/baai/bge-m3 query embedding ──► Vectorize index   │
│   (metadata filter audience ∈ {public} | {public,app})       │
│ 5 Generation: @cf/meta/llama-3.3-70b-instruct-fp8-fast       │
│   (env.AI binding; structured triage JSON when in triage)    │
│ 6 OUTPUT GATE: scope check + canary-token leak check +       │
│   admin-mention filter                                       │
│ Photos: vision call @cf/meta/llama-3.2-11b-vision-instruct   │
│   IN-REQUEST → findings JSON returned → bytes DISCARDED      │
│   (fallback store: KV expirationTtl=1800 — see § GDPR)       │
└───────┬──────────────────┬───────────────────┬───────────────┘
        ▼                  ▼                   ▼
   Workers AI         Vectorize index      Workers KV
   (free neurons)     (built at deploy     (rate limits, quotas,
                       from src/content)    neuron ledger, photo
                                            fallback TTL 30 min)
```

No R2 in the recommended design (see § GDPR — R2 lifecycle granularity
is days, not minutes, so it cannot enforce the 30-minute TTL by itself).

**Bindings** (configured in the CF Pages dashboard, same operational
path as `SUPPORT_RATE_LIMIT_KV` from `tasks/E48-runbook.md` §3 — this
repo has no wrangler config file): `AI` (Workers AI), `SCAM_CHAT_INDEX`
(Vectorize), reuse `SUPPORT_RATE_LIMIT_KV` or bind a dedicated
`SCAM_CHAT_KV`. Document the bind steps in `tasks/E53-runbook.md`.

**Statelessness.** The server holds no session. Each request carries the
bounded conversation history (last N=12 messages, server re-truncates
and sanitizes). Photo findings travel as structured JSON inside the
history, so the bytes never need to outlive their request.

---

## Security & abuse design

### Layered request pipeline (every message)

1. **Payload caps** — message ≤ 2,000 chars, history ≤ 12 turns /
   ≤ 12,000 chars total, photo body ≤ 5 MB (reject larger with 413).
2. **Turnstile** on session start — `verifyTurnstile()` from
   `functions/_lib/security.ts` (already used by the E11/E48 flows).
3. **Rate limits** — KV-backed, reusing `consumeRateLimit` /
   `consumeCooldown` from `functions/_lib/security.ts`:
   - per-IP: 10 messages / 10 min, 40 messages / day
     (`readClientIp()` for identity);
   - per-IP photos: 5 / 30 min (matches the 5-photo product cap);
   - global daily message cap (env-tunable via `parsePositiveInt`,
     default 400/day);
   - **neuron ledger**: every AI call's estimated neuron cost is added
     to a KV daily counter; when the ledger crosses the configured
     budget (default 8,500 of the 10,000 free neurons/day, leaving
     headroom for estimation error) the endpoint fails closed for the
     rest of the UTC day.
4. **File-type sniffing** — photos go through the magic-byte
   verification in `functions/_lib/attachment-sanitize.ts`
   (`MAGIC_SIGNATURES`, JPEG/PNG only for this feature; no PDF uploads).
   Browser-declared Content-Type is never trusted.
5. **Input gate (scope lock + moderation)** — two cheap classifier
   calls before the main model ever sees the message:
   - *topicality*: small instruct model (8B class) with a strict-JSON
     "is this about fraud/scams/this-site? {on_topic: bool}" prompt;
     off-topic → canned Slovak refusal, zero RAG, zero main-model call:
     > „Som asistent zameraný výlučne na ochranu pred podvodmi. S inou
     > témou vám, žiaľ, neporadím."
   - *safety*: `@cf/meta/llama-guard-3-8b` prompt classification;
     unsafe → refusal + the turn is not processed.
6. **Prompt-injection defenses** (precedent:
   `functions/_lib/precheck-prompt.ts`, which already ships the
   untrusted-data-in-XML-tags + "injection attempts are themselves a
   red flag" pattern):
   - user text, history, photo findings, and **RAG chunks** are all
     wrapped in data tags and declared UNTRUSTED in the system prompt —
     retrieved content can carry injection too;
   - history is sanitized server-side: any `system`/tool roles stripped,
     roles forced to user/assistant alternation;
   - the system prompt embeds a per-deploy **canary token**; the output
     gate rejects any response containing it (system-prompt exfiltration
     check).
7. **Output gate** — after generation, a deterministic pass + one cheap
   classifier: response must be (a) free of the canary, (b) free of
   `/admin` route mentions or admin-capability descriptions, (c)
   on-topic. Failures → generic Slovak fallback answer, incident counter
   in KV (admin can inspect volume).

### Role-aware disclosure

- **Identity**: optional `Authorization: Bearer <jwt>`; verified
  server-side with `supabase.auth.getUser(jwt)` exactly like
  `functions/api/support-attachment-upload.ts`. No JWT or invalid JWT →
  role `anon`. (AAL is irrelevant here because admins get no extra
  corpus — see below; `functions/_lib/aal.ts` stays unused by this
  feature.)
- **Two corpus tiers only**: `audience: "public"` (everything an
  anonymous visitor can reach) and `audience: "app"` (signed-in `/app/*`
  functionality, e.g. "kde si nastavím notifikácie" →
  `/app/notifications`). Retrieval filters Vectorize by metadata:
  anon → `public`; signed-in → `public + app`.
- **Admin is a corpus blackout, not a filter**: `/admin/*` routes,
  admin docs (`src/lib/docs/manifest.ts` `ADMIN_DOCS`), and admin
  explainers are **never indexed**. The model cannot leak knowledge it
  was never given. Defense in depth: system prompt instructs the canned
  reply, and the output gate scans for `/admin` mentions. Canned Slovak
  reply (verbatim per product requirement):
  > „Nemám o tom žiadne informácie."
- **Navigation answers** come from a hand-curated route catalog
  (`functions/_lib/scam-chat/route-catalog.ts`, generated from
  `src/routes/**` at authoring time) with an `audience` tag per route —
  the in-app `/docs/*` pages are currently stubs
  (`src/lib/docs/manifest.ts`), so they are not a usable corpus source.

### Why scope-lock is classification, not vibes

The system prompt alone is bypassable. The design holds because:
off-topic input never reaches the main model (input gate), retrieved
context only contains scam/site content (corpus is closed), and output
is re-checked (output gate). A successful jailbreak therefore has to
defeat three independent layers, and even then can only talk about the
content of a public website.

---

## GDPR & retention

| Data | Where | Retention | Notes |
|---|---|---|---|
| Chat messages | Browser React state; transiently in the CF function + Workers AI inference | request lifetime | Never written to KV/R2/Supabase/logs. No terminal storage → no new cookie category. |
| Photos (downscaled) | CF function memory during the vision call | **seconds** (primary path) | Bytes discarded after findings extraction, in the same request. |
| Photos (fallback path) | Workers KV, `expirationTtl: 1800` | ≤ 30 min hard TTL | Only if in-request analysis proves too slow in practice; explicit `kv.delete()` fires immediately after analysis or PDF trigger, TTL is the backstop. KV value cap is 25 MB → a 5 MB photo fits. **R2 is rejected for this**: lifecycle rules have day granularity and cannot enforce 30 minutes. |
| Photo findings (text JSON) | Browser state + request payloads | tab lifetime | Contains model-extracted descriptions, no image bytes. |
| Police-report PDF | Generated **client-side** | user's device only | See below. |
| Rate-limit counters | KV | TTL ≤ 24 h | IP-derived keys, same lawful basis as the E48 limiter (legitimate interest, abuse prevention). |

**PDF: client-side, decided.** The repo already renders PII PDFs in the
browser (`src/lib/dpa/render.client.ts` lazy-imports
`@react-pdf/renderer`; `src/lib/edu/pdf-document.tsx` is the second
precedent). Rendering the police report client-side means: full-quality
photo originals are embedded from local `File` objects without ever
being uploaded; the server only ever sees downscaled copies for
analysis; the assembled report (the most sensitive artifact — name,
timeline, evidence) never transits or rests on our infrastructure.
Server-side rendering would invert all of that for zero benefit. The
server returns structured triage JSON; the client owns layout.

**Privacy/legal surface updates (one batch, one consent bump):**

- `/privacy`: new processing purpose — "AI scam-check assistant";
  processor disclosure: Cloudflare (Workers AI inference, Vectorize,
  KV — already our hosting processor, but inference is a new purpose);
  explicit statement that chat content and photos are not stored beyond
  the processing window (≤ 30 min worst case) and that the PDF is
  generated locally in the browser.
- `/cookies`: no new storage category needed (state is in-memory); the
  Turnstile disclosure already exists from E11/E48 — verify it covers
  the new surface.
- `CONSENT_VERSION` `1.7.0 → 1.8.0` in `src/lib/consent.ts` — **exactly
  once for this epic** (CLAUDE.md rule), in E53.8.
- `CHANGELOG.md` entry (Slovak, renders on /zmeny).
- The widget shows a one-line Slovak notice before first use:
  > „Tento rozhovor spracúva AI. Neukladáme ho — zatvorením karty sa
  > zmaže. Nepíšte sem rodné číslo ani heslá."

**Minors / sensitive input**: triage stories may contain health,
financial, or relationship details. Mitigation: no persistence (above),
plus the notice, plus Llama Guard input screening for self-harm content
with a canned referral to help lines.

---

## RAG pipeline

**Corpus sources** (all in-repo, English/Slovak as authored):

| Source | Path | ~Chunks | Audience |
|---|---|---|---|
| Academy articles (81) | `src/content/blog/*.mdx` (frontmatter: slug, title, excerpt, category, sources) | ~1,800 (300-token chunks, heading-aware) | public |
| Courses | `src/content/courses/*.ts` (structured sections: intro/example/checklist/redflags/do_dont/scenario — chunk per section) | ~300 | public |
| Test packs (9) | DB-backed since E37 G3d (`public.tests` + `platform_pack_metadata`; `src/content/test-packs/` is types-only) — index the public `/firma` pack descriptions via a build-time Supabase fetch, or a checked-in snapshot if the build must stay network-free (open question Q3) | ~50 | public |
| Public pages | route copy for /cookies, /privacy, /kurzy, /testy, /firma, /contact-form, /o-projekte (from i18n bundles) | ~100 | public |
| Route catalog | hand-curated from `src/routes/**` (public routes + `/app/*`; `/admin/*` excluded entirely) | ~60 | public / app |
| Canonical claims | `src/content/claims.ts` (`QUICK_TEST_QUESTION_COUNT`, `QUICK_TEST_TIME_CLAIM`, `COURSE_COUNT`) injected into the system prompt, not embedded — numbers must never drift from canon | — | — |

**Embedding model**: `@cf/baai/bge-m3` — multilingual (100+ languages,
covers Slovak), 1,024 dims. Total ≈ 2,300 chunks ≈ **2.4 M stored
dimensions**, comfortably under the 5 M free cap with ~2× headroom.

**Build-time indexing, refreshed on deploy:**

1. `scripts/build-rag-index.ts` (Node, run in CI or manually): parse MDX
   frontmatter + body, chunk, attach metadata
   `{ source, slug, url, audience, content_hash }`.
2. Diff against the live index by `content_hash` (Vectorize
   upsert-by-id, ids = `source:slug:chunk_n`) — only changed chunks
   re-embed, keeping neuron usage for indexing near zero on routine
   deploys (full rebuild ≈ 2,300 embed calls ≈ one-time, fits in a
   day's free budget).
3. Refresh trigger: manual `npm run rag:index` after content merges to
   `main` (documented in the runbook), optionally a CI step later.
   Stale-by-one-deploy is acceptable for this content type.

**Query path**: embed user message (1 call) → `query()` topK=6 with
audience filter → rerank optionally deferred (Q5) → chunks into the
system prompt as tagged untrusted context with source URLs → the model
must cite the matching page URL in answers ("viac v článku …").

---

## Cost — free-tier allocations vs. expected usage

Pricing/limits verified against Cloudflare docs 2026-06-13. Neuron
conversion: $0.011 per 1,000 neurons (Workers AI pricing page).

| Resource | Free allocation | Unit cost (neurons) | Expected usage | Hard cap (fail closed) |
|---|---|---|---|---|
| Workers AI — chat (`llama-3.3-70b-instruct-fp8-fast`, $0.29/M in · $2.25/M out) | 10,000 neurons/day (Workers Free) | ~140 neurons / turn (≈2.5k in + 350 out) | ~50 plain turns/day ≈ 7,000 | neuron ledger stops at 8,500/day |
| Workers AI — gates (topicality 8B-class + `llama-guard-3-8b`, $0.48/M in) | (same pool) | ~40–55 neurons / turn | included above | same ledger |
| Workers AI — vision (`llama-3.2-11b-vision-instruct`, $0.049/M in · $0.68/M out) | (same pool) | ~40–60 neurons / photo (downscaled) | 5-photo triage ≈ 250 | ≤ 5 photos/session, ledger |
| Workers AI — embeddings (`bge-m3`) | (same pool) | ~1 neuron / query | negligible | — |
| Vectorize storage | 5 M stored dims | — | ~2.4 M dims (2,300 × 1,024) | corpus size asserted in the index script |
| Vectorize queries | 30 M queried dims / month | 1,024 dims / query | ~1,500 queries/mo at expected volume (cap allows ~950/day) | daily message cap ≪ limit |
| Workers KV | 1,000 writes/day · 100,000 reads/day (shared with `SUPPORT_RATE_LIMIT_KV` usage from E48) | ~2–3 writes / turn | ~150 writes/day at 50 turns | 40 msgs/IP/day + global 400/day keeps KV < 50 % |
| Pages Functions requests | 100,000 / day (Workers Free) | 1–2 / turn | trivial | — |
| Turnstile | free | — | 1 / session | — |
| R2 | 10 GB free | — | **not used** | — |

**Capacity verdict (honest):** the free tier supports roughly **40–60
guarded chat turns per day** on the 70B model, i.e. ~10–15 full
conversations or ~4–6 photo-heavy triage sessions, before the ledger
closes the day. Switching chat to an 8B-class model (~95 neurons/turn
incl. gates) roughly **doubles** capacity at the cost of noticeably
weaker Slovak. Recommended: 70B primary; when the ledger passes 50 %
mid-day, degrade generation to 8B (silent quality downgrade beats
unavailability); at 85 % fail closed.

**Vision feasibility (honest):** analyzing five raw 5 MB photos is
neither possible (practical payload/latency) nor useful — vision models
downscale inputs anyway. The design therefore mandates client-side
downscale to ≤ 1,600 px JPEG (~300–500 KB), which preserves screenshot
legibility (the dominant evidence type: SMS/chat/bank screenshots).
Full-resolution originals never leave the device and are embedded into
the PDF locally. Degradation ladder when budget is tight: analyze first
2 photos only → text-only triage with a notice. Premium-only vision is
listed as an open question (Q6), not assumed.

**Fail-closed UX** — quota exhausted (verbatim UI string):
> „Asistent má dnes plno. Skúste to, prosím, zajtra — alebo si zatiaľ
> pozrite naše kurzy o podvodoch."
(with links to /kurzy and /contact-form; HTTP 429 from the gateway).

---

## Story breakdown

### E53.1 — RAG corpus + Vectorize index (P1, M)

Build `scripts/build-rag-index.ts`: MDX/course/route-catalog/i18n
extraction, heading-aware chunking, `bge-m3` embedding, Vectorize
upsert with `{source, slug, url, audience, content_hash}` metadata and
hash-diff incremental refresh. Add `npm run rag:index`.

**AC:**
- Index contains chunks from all 81 blog articles, every course in
  `src/content/courses/index.ts`, the route catalog, and the public
  legal pages; zero chunks with `audience: "admin"` (asserted by the
  script — it must fail the build if any admin route/doc slips in).
- Stored dimensions ≤ 3.5 M (assert in script; leaves 30 % headroom).
- Re-running on unchanged content performs 0 embed calls.
- Unit tests for chunker + audience tagging (Vitest, no network —
  embedding/Vectorize clients injected).
- Runbook section: how to create the index + bind `SCAM_CHAT_INDEX`.

### E53.2 — Gateway function + guardrails (P1, L)

`functions/api/scam-chat/index.ts` (+ `functions/_lib/scam-chat/`):
request schema (zod), Turnstile, role resolution, input gate (topic
classifier + Llama Guard), RAG retrieval with audience filter, 70B
generation with the scoped Slovak system prompt (canary token, data
tags, citation instruction), output gate, history sanitization.

**AC:**
- Off-topic message ("napíš mi básničku") → exact refusal string
  „Som asistent zameraný výlučne na ochranu pred podvodmi. S inou
  témou vám, žiaľ, neporadím." with **zero** main-model neuron spend.
- Injection suite (≥ 15 fixtures: "ignore previous instructions",
  role-play, base64, Slovak-language jailbreaks, injection embedded in
  a fake "RAG chunk") — none leak the canary or change scope; covered
  by Vitest with a mocked `env.AI`.
- On-topic answer includes ≥ 1 citation URL from retrieved metadata.
- Payload over caps → 413/422 with Slovak error body.
- All AI calls flow through one `runAi()` wrapper that records neuron
  estimates (consumed by E53.7's ledger).

### E53.3 — Chat widget UI (P1, M)

Floating launcher (public layout + `/app` shell) + full-page
`/pomocnik` route. React-state-only history, streaming or
progressive rendering, pre-use privacy notice, quota/refusal states,
photo attach UI (disabled until E53.5).

**AC:**
- `data-testid` on every interactive element per CLAUDE.md naming
  (`scam-chat-launcher`, `scam-chat-input`, `scam-chat-send`,
  `scam-chat-message-assistant`, `scam-chat-notice`, …).
- Notice string verbatim: „Tento rozhovor spracúva AI. Neukladáme ho —
  zatvorením karty sa zmaže. Nepíšte sem rodné číslo ani heslá."
- No `window.confirm/alert/prompt`; dialogs use shadcn primitives.
- Reload/tab close empties the conversation (no terminal storage —
  asserted in a test that inspects localStorage/sessionStorage).
- Keyboard + screen-reader accessible (focus trap in the panel,
  `aria-live` for incoming messages); mobile 380 px layout audited.
- 429 from gateway renders the fail-closed string from § Cost.

### E53.4 — Scam triage flow + police-report PDF (P1, L)

Triage state machine in the conversation (system prompt switches to a
structured-output mode returning
`{risk: "low"|"medium"|"high", indicators[], timeline[], evidence[], next_steps[]}`
— zod-validated server-side, retry-once pattern from
`functions/_lib/anthropic.ts`). Client-side PDF
(`src/lib/scam-report/render.client.ts` + template, modeled on
`src/lib/dpa/render.client.ts` + `src/lib/edu/pdf-document.tsx`).

**AC:**
- "bol som podvedený?" style openers route into triage; the model asks
  follow-ups (what/when/channel/amount/counterparty) before assessing.
- `risk: "high"` response recommends contacting the police (158 /
  najbližšie obvodné oddelenie PZ) and offers the PDF button.
- PDF contains: header + generation timestamp, structured timeline,
  fraud indicators, evidence list (incl. photo thumbnails embedded
  from **local** files), recommended next steps, and the disclaimer
  „Tento dokument je automaticky generované zhrnutie a nie je právnym
  posúdením." — rendered entirely client-side, lazy-loaded chunk.
- Malformed model JSON → one retry → graceful text-only fallback.
- Vitest for triage schema + PDF data mapping; PDF template snapshot.

### E53.5 — Photo evidence pipeline + hard TTL (P1, M)

Client: canvas downscale to ≤ 1,600 px JPEG, 5-photo cap, per-file
5 MB pre-check. Server: `POST /api/scam-chat/photo` — magic-byte sniff
(reuse `functions/_lib/attachment-sanitize.ts` signatures, JPEG/PNG
only), in-request vision analysis, findings JSON back, bytes discarded.
KV fallback (TTL 1800 s + explicit delete) implemented behind a flag
but OFF by default.

**AC:**
- 6th photo / oversized / spoofed-extension file rejected client-side
  AND server-side (server test: PNG bytes labeled image/jpeg → 422).
- Primary path: no KV/R2/storage write occurs for photo bytes
  (asserted via injected KV spy in tests).
- Fallback path (flag on): KV entry has `expirationTtl: 1800` and is
  explicitly deleted after analysis — both asserted.
- Vision findings appear in the chat as an assistant evidence summary
  and flow into the E53.4 PDF evidence list.
- Degradation: when the neuron ledger is past the soft threshold, only
  the first 2 photos are analyzed and the UI says so (Slovak notice).

### E53.6 — Role-aware disclosure (P1, M)

JWT verification in the gateway, audience-filtered retrieval, route
catalog with audience tags, admin blackout, output-gate admin filter.

**AC:**
- Anonymous: "kde si nastavím notifikácie?" → answer contains no
  `/app/*` route and gently points to registration; signed-in: same
  question → `/app/notifications`.
- Any admin question (anon, user, AND admin account): verbatim
  „Nemám o tom žiadne informácie." — admins get no special corpus.
- Index-level test: querying Vectorize for admin terms returns zero
  chunks whose URL starts with `/admin` (corpus blackout proof).
- Forged/expired JWT → treated as anon (never 500).

### E53.7 — Rate limiting, quotas + neuron budget ledger (P1, M)

Wire `consumeRateLimit` / `consumeCooldown` / Turnstile from
`functions/_lib/security.ts`; add the KV neuron ledger
(`functions/_lib/scam-chat/budget.ts`) with soft (degrade to 8B /
2-photo cap) and hard (fail closed, 429) thresholds; env-tunable caps
via `parsePositiveInt`.

**AC:**
- Per-IP 10/10 min and 40/day enforced (KV-backed; in-memory fallback
  acceptable in dev only — same contract as E48).
- Ledger: hard stop returns 429 + the verbatim fail-closed string;
  soft threshold demonstrably switches the generation model (test via
  injected env.AI recorder).
- Ledger keys are day-stamped, TTL 86,400 — no unbounded KV growth.
- A misconfigured/missing KV binding logs loudly and **fails closed**
  for the ledger (free-tier overrun must be impossible), while rate
  limits fall back to in-memory (documented trade-off).
- Vitest covers limit boundaries, day rollover, concurrent overshoot
  tolerance (read-then-write semantics documented as in security.ts).

### E53.8 — Privacy, cookies, consent + changelog (P1, S)

`/privacy` new processing section (Workers AI inference, no-retention
statement, client-side PDF), `/cookies` review, `CONSENT_VERSION`
1.7.0 → 1.8.0 (single bump for the epic), `CHANGELOG.md` entry,
widget notice cross-checked.

**AC:**
- /privacy names Cloudflare Workers AI as processor + purpose; states
  photo max-retention 30 min and zero transcript retention.
- Consent banner re-appears exactly once for existing users
  (`src/lib/consent.ts` version-mismatch test updated).
- tests/content claims tests stay green (no canonical-number drift).
- Story lands in the SAME PR batch as the first user-visible widget
  release — the feature must not ship to prod before the legal text.

### E53.9 — E2E + abuse test suite (P1, M)

Playwright specs with POM (`e2e/poms/scam-chat/ScamChat.ts` — POM-only
locators per CLAUDE.md), mocking `/api/scam-chat*` at the route layer
for deterministic CI; one optional live smoke tagged for manual runs.

**AC:**
- E2E: open widget → on-topic Q&A with citation; off-topic refusal
  (verbatim string); triage happy path → PDF download asserted
  (filename + non-zero size); photo attach + reject paths; quota-
  exhausted 429 state; anonymous vs signed-in disclosure difference
  (audit-bot account per CLAUDE.md for the signed-in leg).
- Abuse: injection fixtures replayed through the real gateway in a
  Vitest integration layer (mocked env.AI), asserting gate decisions.
- Suite green in CI; lint 0/0; build ✓.

**Sequencing:** E53.1 → E53.2 → (E53.3 ∥ E53.6 ∥ E53.7) → E53.4 →
E53.5 → E53.8 → E53.9. Merge to `main` only with the whole epic done
(CLAUDE.md epic rule); bindings + index creation are prod-ops steps in
the runbook, executed by the owner at merge time.

---

## Risks & open questions for the product owner

**Risks**

- **R1 — Slovak fluency of open models.** Llama 3.3 70B produces
  serviceable but occasionally clumsy Slovak; 8B (degraded mode) is
  noticeably worse. Mitigations: few-shot Slovak examples in the system
  prompt, short answers, citations carrying the canonical Slovak copy.
  Fallback option (owner decision, costs money): route final generation
  through the existing Anthropic Haiku client (~$0.003/turn at current
  `functions/_lib/anthropic.ts` pricing constants).
- **R2 — capacity is genuinely small** (~40–60 turns/day free). If the
  widget is promoted on the homepage it will hit the cap daily. The
  fail-closed UX is designed, but expectations must be set.
- **R3 — model catalog churn**: `llama-3-8b-instruct` is already
  deprecated (2026-05-30); model ids must be env-configurable, not
  hardcoded, and reviewed at implementation time.
- **R4 — triage liability**: a "low risk" verdict on an actual fraud is
  the worst failure mode. The prompt is calibrated to over-recommend
  police contact on uncertainty, and every triage answer carries the
  disclaimer; legal text review recommended.
- **R5 — KV write budget (1,000/day) is shared** with the E48 support
  limiter; a support-spam day could starve chat counters (and vice
  versa). Caps keep combined usage < 50 % at expected volume; monitor.

**Open questions**

- **Q1 — Placement & promotion**: floating launcher on all public pages,
  or only /kurzy + blog + a dedicated /pomocnik entry? Drives daily
  volume directly against R2.
- **Q2 — Daily capacity policy**: accept ~50 free turns/day, or approve
  Workers Paid ($5/mo baseline, overage $0.011/1k neurons) as a ceiling
  raise? The architecture is identical either way; only the ledger
  thresholds change.
- **Q3 — Pack content in RAG**: build-time Supabase fetch (build needs
  network + anon key) vs. a checked-in JSON snapshot refreshed manually?
  Snapshot is simpler and deterministic; recommend snapshot.
- **Q4 — Signed-in gating**: should triage + photos require sign-in
  (better abuse posture, smaller anonymous attack surface) or stay
  anonymous (lower barrier for scam victims — likely the right call for
  the mission)? Plan assumes anonymous-allowed.
- **Q5 — Reranker**: add `@cf/baai/bge-reranker-base` after retrieval
  for quality, at ~+10–20 neurons/turn? Deferred unless retrieval
  quality disappoints in E53.1 evaluation.
- **Q6 — Vision degradation tier**: when budget is tight, is
  "first 2 photos only" acceptable, or should photo analysis become a
  signed-in-only perk? Plan assumes the former.
- **Q7 — Transcript opt-in (future)**: do we ever want an explicit
  user-initiated "email me this conversation" (would create a retention
  surface + consent implications)? Out of scope now; flagging so it is
  a conscious NO rather than scope creep later.
