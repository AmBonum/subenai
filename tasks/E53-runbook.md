# E53 — Scam-chat assistant runbook

**Audience:** project owner / on-call. Operational reference for the
AI scam-check assistant ("Podvodový poradca") — Vectorize index, Workers
AI + KV bindings, and the RAG corpus refresh.

**State of the runbook:** §1 ships with E53.1 (corpus builder + route
catalog). Later sections are added as E53.2+ land. The architecture and
acceptance criteria live in `tasks/stories/E53-scam-chat-agent.md`.

---

## §1 — Vectorize index, bindings + corpus indexing

The repo has **no wrangler config file** — bindings are configured in
the CF Pages dashboard, same operational path as `SUPPORT_RATE_LIMIT_KV`
(see `tasks/E48-runbook.md` §3). `scripts/build-rag-index.ts` builds the
corpus locally and talks to the Cloudflare REST API directly, so it
needs an API token, not a binding.

### 1. Create the Vectorize index (one-time)

The embedding model is `@cf/baai/bge-m3` → **1,024 dimensions**,
**cosine** metric. Either via wrangler (no config file needed — it is a
direct API call):

```bash
npx wrangler vectorize create scam-chat-rag --dimensions=1024 --metric=cosine
```

or dashboard: **Workers & Pages** → **Vectorize** → **Create index** →
name `scam-chat-rag`, dimensions `1024`, metric `cosine`.

Capacity math (asserted by the index script on every run): the corpus
is currently 1,786 chunks × 1,024 dims ≈ **1.83 M stored dimensions**;
the script fails the build above **3.5 M** (30 % headroom under the 5 M
free cap).

### 2. Bind the Pages project (one-time)

Pages project → **Settings** → **Functions**:

1. **Workers AI bindings** → Add → Variable name `AI`.
2. **Vectorize index bindings** → Add → Variable name
   `SCAM_CHAT_INDEX`, select `scam-chat-rag`.
3. **KV namespace bindings** → the chat reuses the existing
   `SUPPORT_RATE_LIMIT_KV` namespace for rate limits + the neuron
   ledger (E53.7 decision; bind a dedicated `SCAM_CHAT_KV` instead if
   isolation from the E48 limiter is preferred).
4. Save + redeploy. Bind on **both Production and Preview** — branch
   deploys fail any feature requiring missing bindings.

These bindings are consumed by the E53.2 gateway function; until that
lands, only the index + the indexing token below are actually needed.

### 3. Index the corpus (`npm run rag:index`)

The script needs an API token with **Account → Workers AI: Edit** and
**Account → Vectorize: Edit** permissions (create under **My Profile →
API Tokens**; scope it to this account only):

```bash
CF_ACCOUNT_ID=<account id> CF_API_TOKEN=<token> npm run rag:index
```

Without credentials (or with `--dry-run`) the script runs in **plan
mode**: builds + validates the corpus, prints per-source chunk stats,
performs **zero network calls**. This is what CI and local checks run.

What a real run does:

1. Extracts + chunks the corpus: 81 blog MDX articles
   (`src/content/blog/*.mdx`), every course in
   `src/content/courses/index.ts`, the hand-curated route catalog
   (`functions/_lib/scam-chat/route-catalog.ts`), and the public legal
   pages (`src/i18n/locales/sk/legal.json` → /privacy, /cookies).
2. Enforces the **admin blackout**: the run fails if any chunk or
   catalog entry has a non-`public`/`app` audience or a URL under
   `/admin` — admin knowledge is never indexed (E53.6).
3. Hash-diffs against the live index (`get_by_ids` on deterministic ids
   `source:slug:chunk_n`, comparing `content_hash` metadata) — only
   changed chunks are re-embedded, so a re-run on unchanged content
   costs **0 embed calls / 0 neurons**. A full cold rebuild is ~1,800
   embed calls, well inside one day's 10,000 free neurons.
4. Upserts vectors with `{source, slug, url, audience, content_hash,
   text}` metadata (`text` rides along so the gateway can inject
   retrieved chunks without a second lookup).
5. Writes `.rag-index-manifest.json` (gitignored, operator-local) — the
   id inventory of the last successful run, used to **delete stale
   vectors** when content disappears. If the manifest is missing (first
   run on a new machine), stale-vector cleanup is skipped for that run;
   it self-heals on the next content change or can be forced by
   re-creating the index.

**When to run:** manually after content merges to `main` (new/edited
blog posts, courses, routes, legal copy). Stale-by-one-deploy is
acceptable. Optionally promote to a CI step later.

**Verification note (2026-06-13):** the REST clients
(`WorkersAiEmbeddingClient`, `VectorizeRestClient`) are covered by unit
tests against injected fakes; they have not yet been exercised against
the live Cloudflare API because the index/token do not exist yet. The
first real `npm run rag:index` is an owner step at epic-merge time —
expect to sanity-check the first run's output (`embedded ≈ 1,786`,
`skipped 0`) and a follow-up run (`embedded 0, skipped ≈ 1,786`).
