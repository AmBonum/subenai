# E44 — Template Marketplace (private CRUD → public submission → admin moderation → SEO gallery)

**Owner:** Claude — drives ownership/visibility model rebuild on `public.templates`, plus three follow-on phases (AI moderation, admin queue, public gallery).
**Date opened:** 2026-05-20
**Status:** 🟡 Planned — branch `claude/practical-jackson-f9b411` (rename to `feature/E44-template-marketplace` before pushing PR-A; see § Branch).
**Originating request:** `/app/templates` should show **real, useful templates** to every user (defaults visible to all), let users **duplicate / edit / delete their own copies** without affecting anyone else, allow **submission for public listing** behind **AI precheck + admin manual approval with notifications**, and expose a **SEO-indexable public gallery** so the library doubles as marketing surface. All of this must hold senior-level quality on SEO, marketing, copyright, UX/UI, and a11y.

## TL;DR

The current `public.templates` table is **flat** — no ownership, no visibility, no submission flow:

| Column                  | Today                                            | Needed                                       |
|-------------------------|--------------------------------------------------|----------------------------------------------|
| `id, title, description, question_ids, gdpr_purpose, created_at` | Yes (admin-only writes, all-auth read) | Yes |
| `owner_id`              | ❌                                                | **NOT NULL** for user-owned rows; NULL for platform-seeded defaults |
| `visibility`            | ❌                                                | enum: `private` / `public` / `unlisted` |
| `fork_of`               | ❌                                                | UUID → source template (audit + attribution) |
| `status`                | ❌                                                | enum: `draft` / `published` (only public+published renders to non-owners) |
| `license`               | ❌                                                | enum (`cc-by-4.0` default), pinned at publish |
| `author_display_name`   | ❌                                                | snapshot of profile.full_name at publish time (so display survives profile rename / delete) |
| `age_rating`            | ❌                                                | enum: `all` / `13+` / `16+` / `18+` |
| `slug`                  | ❌                                                | URL-safe identifier for `/sablony/$slug` |
| `published_at`          | ❌                                                | timestamptz NOT NULL when published |
| `updated_at`            | ❌                                                | for cache/SEO `dateModified` |

The current RLS (2 policies: `templates_auth_read` + `templates_admin_write`) is rewritten into **6 policies** that enforce: anyone reads platform defaults (`owner_id IS NULL`) + own private rows + public+published rows; owner writes own private rows; admins write everything; nobody else touches `owner_id IS NULL`.

The submission flow lives on a **new table** `public.template_submissions` (Phase B). The AI precheck (Phase B) runs as a CF Pages Function calling **Claude Haiku 4.5** with a structured-output rubric → result stored on the submission row → admin queue (Phase C) reads it. Notifications use the existing `notifications` table with a new `kind = 'admin'` channel (single migration in C). The public gallery (Phase D) renders at `/sablony` (indexed) + `/sablony/$slug` (detail with JSON-LD + OG image).

**Phase A ships first** as a standalone PR. Phases B–D follow in separate PRs from the same branch (or follow-up branches), each independently mergeable.

## Scope

### In (this epic across all 4 phases)

- Schema: rewrite `public.templates` (add 9 columns + slug index + RLS rewrite) and create `public.template_submissions`.
- `/app/templates`: rebuild with **two tabs** ("Verejné" / "Moje"), search + category filter on each tab, row actions (Použiť / Duplikovať / Upraviť / Vymazať / Odoslať na zverejnenie). Edit + duplicate dialogs that respect owner-only RLS. Submission dialog with explicit **CC BY 4.0** consent + age-rating self-declare.
- `/admin/templates`: new admin moderation queue with pending count badge in admin shell, view of AI precheck JSON, approve / reject (with reason) → audit_log entry on every action + admin notification fanout for the next admin.
- AI precheck: CF Pages Function `functions/api/templates/precheck.ts` → Claude Haiku 4.5 → JSON `{safety, profanity, age_rating, copyright_red_flags, summary}` written to `template_submissions.precheck` (jsonb) + `precheck_passed` boolean.
- `/sablony` (public, indexed) + `/sablony/$slug` (detail) — anon-friendly marketing gallery with JSON-LD, OG cards, sitemap entry. The same data, two surfaces (logged-in = app shell, anon = marketing shell).
- Slovak production copy across all four surfaces, hand-tuned for SEO and marketing tone (see § Marketing/SEO appendix).
- Default platform templates: **15 seeded** (today there are 0 in prod, 5 in seed.ts). Seeded as migration data rows with `owner_id = NULL` so they are everyone's default library.
- `/privacy` update for the public-publication & license terms (one CONSENT_VERSION bump at epic-end).
- E2E + integration tests on the RLS contract (anon, owner, other-user, admin) + happy-path user flow + admin moderation flow.

### Out — explicitly NOT done in this epic

- **Multi-language template content.** Templates stay Slovak-only on the data side. i18n routing for `/sablony` is out (we have `/sablony` only).
- **Live AI precheck rerun on edit.** Precheck runs at submission only. Re-edit re-submits (resets state).
- **Template versioning / history.** A template has one current version. (Authors can duplicate to fork.)
- **Comments / ratings / stars on templates.** Out of scope; would be a separate epic.
- **Stripe paid templates / marketplace monetisation.** Out — Phase D is free gallery only.
- **Question authoring inside the template editor.** Authors pick from existing `public.questions`; new-question authoring stays in the existing builder.
- **Migrating the current `noindex` on `/app/templates`.** Stays noindex (app surface). SEO lives on `/sablony`.

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| D1 | **Public gallery at `/sablony`** (Slovak), `/app/templates` stays noindex. | Marketing + SEO value at `/sablony`; app surface keeps clean UX for logged-in flow. |
| D2 | **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) as the moderation model with structured-output schema. | Consistent vendor stack (Anthropic), structured output, ~$0.001 / submission, 1–3s latency. Cost ceiling enforced in CF Function. See Appendix C. |
| D3 | **License: author retains + CC BY 4.0** with attribution snapshot at publish. | Senior-level legal clarity for EU; no irrevocable rights transfer; author display name preserved across profile rename. See Appendix B. |
| D4 | **Age rating: 4 buckets** — `all` / `13+` / `16+` / `18+`. Author self-declares, AI verifies, admin overrides. | PEGI-aligned but simplified for awareness-content domain. |
| D5 | **Soft-delete vs hard-delete on user templates.** Hard delete + cascade. User-owned drafts have no compliance retention obligation; if `owner_id IS NULL` (platform default), DELETE is admin-only. | Smallest schema; no `deleted_at` graveyard; user expectation of "delete = gone". |
| D6 | **Mine tab vs Public tab.** Two tabs on `/app/templates`. "Verejné" = defaults + admin-approved community templates. "Moje" = `owner_id = auth.uid()` (any visibility). | Clear mental model; the two read paths have different RLS predicates anyway. |
| D7 | **Submission moderation queue lives at `/admin/templates`** (new route), distinct from existing `/admin/tests`. Pending count surfaces in admin shell header as a badge. | Templates ≠ tests; different schema, different reviewer mindset. |
| D8 | **Admin notifications channel** — extend `notifications.kind` (new column with default `'user'`); `'admin'` rows visible only to users with `has_role(auth.uid(), 'admin')`. Single migration in Phase C. | Reuses existing table + RLS pattern; avoids a parallel admin_notifications table. |
| D9 | **No `CONSENT_VERSION` bump** for Phase A (no new processor, no new data category — only widening within an existing table). Single bump deferred to Phase D when `/privacy` adds the publication/license section. | Per CLAUDE.md "never bump CONSENT_VERSION more than once per epic batch". |
| D10 | **Branch + PR sequencing**: PR-A from `claude/practical-jackson-f9b411` (rename to `feature/E44-template-marketplace`). PR-B/C/D from the same branch or fresh `feature/E44-phase-b`. User decides at PR-A merge time. | Avoids one giant 4-phase PR that's unreviewable. |
| D11 | **Edge cases handled at the DB level**: a public template that gets revoked drops back to `visibility='private'` but keeps `fork_of` history on user copies. Users who already forked keep their fork intact (no cascade). | Forks are independent rows from the moment of duplication. |

## Phase map

### Phase A — Foundation: DB + RLS + private CRUD on `/app/templates` (THIS PR)

| ID    | Title                                                                                                                | Effort | Priority | Status |
|-------|----------------------------------------------------------------------------------------------------------------------|--------|----------|--------|
| E44.1 | Migration `templates_v2_ownership.sql` — 9 new columns, slug index, 6 RLS policies, 15 default-template inserts, supabase types sync | `M` | `P1` | 🟡 Ready |
| E44.2 | Queries layer rewrite: `useMyTemplates`, `usePublicTemplates`, `useDuplicateTemplate`, `useEditOwnTemplate`, `useDeleteOwnTemplate` + `Template` type extension | `S` | `P1` | 🟡 Ready |
| E44.3 | `/app/templates` UI rebuild: Tabs ("Verejné" / "Moje"), row actions, Edit + Duplicate dialogs, Slovak i18n strings | `M` | `P1` | 🟡 Ready |
| E44.4 | Unit + RLS contract tests (Vitest: query unit tests; integration `tests/db/templates_rls.test.ts` against migration SQL string + a minimal RLS smoke against a stub) | `M` | `P1` | 🟡 Ready |
| E44.5 | Phase-A docs: story files, CHANGELOG `[Unreleased]` entry, PR description with post-merge migration SQL | `XS` | `P2` | 🟡 Ready |

**Phase A acceptance:** every authenticated user sees the 15 default templates on the "Verejné" tab; can duplicate any default into their own; can edit / delete their own copies; cannot mutate anyone else's; cannot mutate `owner_id IS NULL` rows; admin retains full write access via existing role check. No AI, no submission, no admin queue, no public gallery yet.

### Phase B — AI precheck + submission flow (PR-B)

| ID    | Title                                                                                              | Effort | Priority | Status |
|-------|----------------------------------------------------------------------------------------------------|--------|----------|--------|
| E44.6 | Migration `template_submissions.sql` — new table + RLS (owner reads own; admin reads/writes all)   | `S`   | `P1` | ✅ Done (2026-05-21, PR-B) |
| E44.7 | CF Function `functions/api/templates/precheck.ts` — Claude Haiku 4.5, structured output, rate-limit, cost ceiling | `M` | `P1` | ✅ Done (2026-05-21, PR-B) |
| E44.8 | Submission dialog: CC BY 4.0 consent checkbox + age-rating self-declare + author display name confirmation | `S` | `P1` | ✅ Done (2026-05-21, PR-B) |
| E44.9 | Integration tests: precheck contract, rate-limit, cost ceiling boundary; submission RLS  | `M` | `P2` | ✅ Done (2026-05-21, PR-B) |

### Phase C — Admin moderation queue + notifications (PR-C)

| ID     | Title                                                                                                         | Effort | Priority | Status |
|--------|---------------------------------------------------------------------------------------------------------------|--------|----------|--------|
| E44.10 | `/admin/templates` route — pending queue, precheck JSON viewer, approve/reject with reason, audit_log writes  | `M`   | `P1` | ⏳ Blocked on B |
| E44.11 | Migration: `notifications.kind` enum + RLS update; admin-shell pending badge + `useAdminPendingCount`         | `S`   | `P1` | ⏳ Blocked on B |
| E44.12 | (Optional) Resend email digest to admins on new submission, daily cadence                                     | `S`   | `P3` | ⏳ Blocked on B |

### Phase D — Public SEO gallery + marketing copy + privacy (PR-D)

| ID     | Title                                                                                                  | Effort | Priority | Status |
|--------|--------------------------------------------------------------------------------------------------------|--------|----------|--------|
| E44.13 | `/sablony` route — anon-friendly indexed list, marketing copy, OG card                                 | `M`   | `P1` | ⏳ Blocked on C |
| E44.14 | `/sablony/$slug` detail — JSON-LD, structured data, OG image generation                                | `M`   | `P1` | ⏳ Blocked on C |
| E44.15 | Sitemap + robots.txt update + Slovak SEO H1/H2 + CTA copy (see Appendix A)                             | `S`   | `P2` | ⏳ Blocked on C |
| E44.16 | `/privacy` + `/cookies` + CHANGELOG epic line + single CONSENT_VERSION bump                            | `S`   | `P1` | ⏳ Blocked on C |

## Phase A — story detail

### E44.1 Migration `templates_v2_ownership.sql`

**File:** `supabase/migrations/20260520200000_templates_v2_ownership.sql` (the existing 20260520200000_user_digests.sql is one of the latest; timestamp picked one minute later)
**Counterpart:** mirror into `DEPLOY_SETUP.sql` (CLAUDE.md rule).

DDL outline:

```sql
-- Enums (new)
CREATE TYPE public.template_visibility AS ENUM ('private', 'public', 'unlisted');
CREATE TYPE public.template_status     AS ENUM ('draft', 'published');
CREATE TYPE public.template_license    AS ENUM ('cc-by-4.0');
CREATE TYPE public.template_age_rating AS ENUM ('all', 'thirteen_plus', 'sixteen_plus', 'eighteen_plus');

-- Columns on public.templates
ALTER TABLE public.templates
  ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN visibility template_visibility NOT NULL DEFAULT 'private',
  ADD COLUMN fork_of uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  ADD COLUMN status template_status NOT NULL DEFAULT 'draft',
  ADD COLUMN license template_license NOT NULL DEFAULT 'cc-by-4.0',
  ADD COLUMN author_display_name text,
  ADD COLUMN age_rating template_age_rating NOT NULL DEFAULT 'all',
  ADD COLUMN slug text UNIQUE,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX templates_owner_visibility_idx ON public.templates (owner_id, visibility) WHERE owner_id IS NOT NULL;
CREATE INDEX templates_public_published_idx ON public.templates (visibility, status) WHERE visibility = 'public' AND status = 'published';
CREATE INDEX templates_fork_of_idx ON public.templates (fork_of) WHERE fork_of IS NOT NULL;

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.touch_templates_updated_at() ...;
CREATE TRIGGER templates_touch_updated_at BEFORE UPDATE ON public.templates ...;

-- Trigger: defend platform defaults (owner_id IS NULL) from non-admin writes (defense in depth on top of RLS)
CREATE OR REPLACE FUNCTION public.forbid_default_template_mutation() ...;
CREATE TRIGGER templates_forbid_default_mutation BEFORE UPDATE OR DELETE ON public.templates
  FOR EACH ROW WHEN (OLD.owner_id IS NULL) EXECUTE FUNCTION public.forbid_default_template_mutation();

-- RLS rewrite (drop existing 2 policies, install 6)
DROP POLICY IF EXISTS templates_auth_read ON public.templates;
DROP POLICY IF EXISTS templates_admin_write ON public.templates;

CREATE POLICY templates_read_defaults ON public.templates
  FOR SELECT TO authenticated USING (owner_id IS NULL);

CREATE POLICY templates_read_own ON public.templates
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY templates_read_public_published ON public.templates
  FOR SELECT TO authenticated USING (visibility = 'public' AND status = 'published');

CREATE POLICY templates_insert_own ON public.templates
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND visibility IN ('private', 'unlisted'));

CREATE POLICY templates_update_own ON public.templates
  FOR UPDATE TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid() AND visibility IN ('private', 'unlisted'));
    -- public visibility transition is admin-only (Phase C)

CREATE POLICY templates_delete_own ON public.templates
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Admin full-access policy retained
CREATE POLICY templates_admin_all ON public.templates
  FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Default templates seeding (15 rows) — owner_id NULL, visibility 'public', status 'published'
INSERT INTO public.templates (id, title, description, question_ids, gdpr_purpose, visibility, status, slug, age_rating, published_at)
VALUES
  ('tpl_default_001', 'Onboarding kolegov', '...', ARRAY[...]::uuid[], 'internal_training', 'public', 'published', 'onboarding-kolegov', 'all', now()),
  ... (15 rows)
ON CONFLICT (id) DO NOTHING;
```

**Self-check SQL** (paste into PR description for post-merge verification):
```sql
SELECT count(*) FROM public.templates WHERE owner_id IS NULL; -- expect 15
SELECT polname FROM pg_policies WHERE tablename = 'templates' ORDER BY polname; -- expect 7 (6 named + admin)
SELECT indexname FROM pg_indexes WHERE tablename = 'templates' ORDER BY indexname;
```

### E44.2 Queries layer rewrite

**File:** `src/lib/platform/queries.ts` (and `src/lib/platform/types.ts` for the extended `Template` shape).

Splits the current `useTemplates` into two hooks. Adds three new mutations. Maps the new columns into the `Template` TS type (additive, no breaking changes for `app.tests.new` that consumes `template_ids`).

```ts
// types.ts (additive)
export interface Template {
  id: string;
  title: string;
  description: string | null;
  question_ids: string[];
  gdpr_purpose: GdprPurpose;
  owner_id: string | null;
  visibility: 'private' | 'public' | 'unlisted';
  fork_of: string | null;
  status: 'draft' | 'published';
  license: 'cc-by-4.0';
  author_display_name: string | null;
  age_rating: 'all' | 'thirteen_plus' | 'sixteen_plus' | 'eighteen_plus';
  slug: string | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
}

// queries.ts
export function useMyTemplates() { /* select() where owner_id = auth.uid() */ }
export function usePublicTemplates() { /* select() where owner_id IS NULL OR (visibility='public' AND status='published') */ }
export function useDuplicateTemplate() { /* insert with owner_id = me, visibility='private', fork_of = source.id, title = source.title + ' (kópia)' */ }
export function useUpdateOwnTemplate() { /* update WHERE id = ? AND owner_id = auth.uid() — RLS enforces, but be explicit */ }
export function useDeleteOwnTemplate() { /* delete WHERE id = ? AND owner_id = auth.uid() */ }
```

The legacy `useTemplates`, `useCreateTemplate`, `useUpdateTemplate`, `useDeleteTemplate` are **kept** for admin code paths but marked `@deprecated` in JSDoc; the route `/app/tests/new` (which uses templates only for read-then-clone-into-test, not for ownership) keeps reading the union via `usePublicTemplates`.

### E44.3 `/app/templates` UI rebuild

**File:** `src/routes/app.templates.tsx` (full rewrite) + new components in `src/components/app/templates/`:
- `TemplatesTabs.tsx` (Verejné / Moje)
- `TemplateCard.tsx` (extracted from current inline; adds Duplikovať / Upraviť / Vymazať action menu)
- `TemplateEditDialog.tsx` (title, description, category, question picker — reuses existing `QuestionPickerDialog`)
- `TemplateDuplicateDialog.tsx` (confirm + optional rename inline)
- `TemplateDeleteConfirm.tsx` (destructive confirm)

**Slovak i18n strings (verbatim)** — added to `src/i18n/locales/sk/tests.json` under `templates.*`:
- `tab_public`: "Verejné"
- `tab_mine`: "Moje"
- `tab_mine_empty`: "Ešte si si žiadnu šablónu nezduplikoval. Začni z verejnej knižnice."
- `row_action_duplicate`: "Duplikovať"
- `row_action_edit`: "Upraviť"
- `row_action_delete`: "Vymazať"
- `row_action_submit_public`: "Odoslať na zverejnenie" *(Phase B; placeholder hidden behind feature flag in Phase A)*
- `duplicate_dialog_title`: "Duplikovať šablónu"
- `duplicate_dialog_body`: "Vytvoríme tvoju vlastnú kópiu, ktorú môžeš upravovať bez ovplyvnenia originálu."
- `edit_dialog_title`: "Upraviť šablónu"
- `delete_confirm_title`: "Vymazať šablónu?"
- `delete_confirm_body`: "Tvoja kópia bude nenávratne odstránená. Originálnu verejnú šablónu to neovplyvní."
- `badge_default`: "Predvolené"
- `badge_mine`: "Moja kópia"
- `badge_age_thirteen_plus`: "13+", etc.

UI/UX upgrades over the current implementation (from § A.UX appendix, output of design subagent):
- Card density: 3 columns at `lg+`, 2 at `md`, 1 at `sm` (today: 2 at `md+`).
- Sticky filter bar; results count next to the search input.
- Action menu (kebab) for secondary actions; primary `Použiť` button stays inline.
- Skeleton loaders during fetch (today: nothing rendered until data lands).
- Empty states differentiated per tab.
- Keyboard support: `J / K` to move focus between cards; `Enter` = Použiť; `D` = Duplikovať; `E` = Upraviť; `Del` = Vymazať.

### E44.4 Tests

| Layer | File | What it covers |
|---|---|---|
| Unit (Vitest) | `tests/lib/platform/queries.templates.test.ts` | mock supabase client; verify query builders emit the right `.eq()`/`.or()` for each hook; verify duplicate mutation copies the right fields. |
| Component (Vitest + RTL) | `tests/components/app/templates/TemplatesPage.test.tsx` | renders tabs, switches, opens dialogs, empty states, action menu items present per row type (owned vs not). |
| DB contract (Vitest) | `tests/db/templates_v2_ownership.test.ts` | regex-asserts migration SQL contains the 6 policies, the 3 indexes, the 4 enums, the 15 INSERT rows, and the `forbid_default_template_mutation` trigger. |
| E2E (Playwright) | `e2e/specs/app/templates.spec.ts` *(stub; full spec lands with Phase D when public gallery exists)* | smoke: log in → /app/templates → see 15 public templates → duplicate one → it appears in Moje tab → edit it → delete it. |

### E44.5 Docs

- 5 story files: `tasks/stories/E44.1-templates-migration.md` … `E44.5-phase-a-docs.md` (templates fronted by DoD checklist, ACs, subtasks).
- `CHANGELOG.md` `[Unreleased]` Slovak line: *"Šablóny: pridali sme tvoju vlastnú knižnicu — duplikuj predvolené šablóny, uprav alebo vymaž svoje kópie. Verejné odosielanie a admin schvaľovanie príde v ďalšej aktualizácii."*
- `tasks/stories/README.md` row added for E44 with 5/16 stories Ready.
- PR-A description template: see § "PR-A description" at bottom.

## Open questions (deferred to phase owner)

| ID | Question | Phase | Default if not answered |
|----|----------|-------|--------------------------|
| Q1 | Does a user-published template's CC BY 4.0 attribution need to render on `/sablony/$slug` AND on the card in `/app/templates`? | D | Yes on both. |
| Q2 | Should the AI precheck JSON be visible to the submitting user (transparency) or admin-only? | C | Show user a summarised verdict (`accepted` / `held_for_review` / `rejected_for_reason`) but not the raw JSON. Admin sees full JSON. |
| Q3 | Re-submission cooldown? E.g. if rejected, user can re-submit after edit; how often? | B | 24h cooldown after rejection on the same template id. |
| Q4 | Mirror `/sablony` in CZ/EN i18n at launch or post-launch? | D | Post-launch — Slovak-only for Phase D. |

## Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Existing `useTemplates` callers (`/app/tests/new`) break when split into two hooks. | Step 1 keeps `useTemplates` as a compatibility shim returning the union; only deprecates it. Migrate callers in same PR. |
| R2 | The `forbid_default_template_mutation` trigger blocks the admin path. | Trigger checks `auth.role()` for `service_role` and exits early; admin UI goes through service-role server-fn for default-template edits. |
| R3 | AI precheck cost runaway. | CF Function enforces `MAX_PRECHECK_PER_USER_PER_DAY = 5` + global ceiling via shared rate-limit table. Phase B-only concern. |
| R4 | Slug collisions on community templates. | Slug generated server-side from title + 6-char nanoid suffix; unique index enforces final guard. |
| R5 | A user duplicates a template with thousands of questions → DB INSERT slow. | `question_ids` is uuid[], not a join table. Even 1000 ids = small row; INSERT is fast. No additional mitigation. |
| R6 | Admin queue grows unbounded if no moderator works it. | Phase C ships with daily Resend digest to admins; pending badge in admin shell stays visible until 0. |

## Branch + PR sequencing

- **Current branch:** `claude/practical-jackson-f9b411`. **Rename** to `feature/E44-template-marketplace` before opening PR-A (`git branch -m feature/E44-template-marketplace; git push -u origin feature/E44-template-marketplace; git push origin :claude/practical-jackson-f9b411`) — done only with explicit user OK.
- **PR-A** = Phase A. Mergeable independently. Closes E44.1–E44.5.
- **PR-B / -C / -D** = the next three phases, opened sequentially from the same branch or fresh branches at the user's preference (decided at A-merge time per D10).

## Sub-agent appendices (planning depth)

Four appendices, produced in parallel by four subagents with skill activations, populate `tasks/E44-appendix-*.md`:

- **Appendix A — SEO + Marketing strategy for `/sablony`.** Spawned with `marketing:seo-audit` + `marketing:campaign-plan` skills. Deliverable: keyword cluster, H1/H2 outlines, meta description draft, OG card design brief, JSON-LD `CreativeWork` shape, sitemap entry pattern, internal-link plan, Slovak headline drafts.
- **Appendix B — Legal: CC BY 4.0 submission consent + `/privacy` deltas.** Spawned with `legal:review-contract` skill. Deliverable: verbatim Slovak consent checkbox text, retention/license paragraph for `/privacy` s5, GDPR controller/processor analysis for user-published templates, edge case: what happens to a user-submitted public template when the user deletes their account (defaults to: attribution `"Anonym"` + template stays per CC BY 4.0 irrevocability for those who already forked it).
- **Appendix C — AI moderation rubric (Claude Haiku 4.5).** Spawned with `claude-api` + `feature-dev:code-architect` skills. Deliverable: system prompt (English), JSON-output schema, classification rubric (safety / profanity / age_rating / copyright_red_flags), cost model per submission, latency budget, fallback when the model returns malformed JSON, prompt-injection hardening (the template content is untrusted input).
- **Appendix D — UX/UI critique of current `/app/templates` + a11y spec for the new dialogs.** Spawned with `design:design-critique` + `design:accessibility-review` skills. Deliverable: prioritised list of UX nedostatky on current page (with severity), ARIA / focus-trap / keyboard spec for Edit, Duplicate, Delete dialogs, contrast checks, mobile-first layout notes, micro-interaction details.

These appendices land alongside this plan in `tasks/E44-appendix-A.md` … `tasks/E44-appendix-D.md`. They become the canonical reference for the relevant Phase A–D stories. They contain the **why** — this plan contains the **what** — and the story files contain the **how + acceptance criteria**.

## PR-A description (draft to be finalised at PR time)

```
title: feat(templates): E44 Phase A — private CRUD + Mine/Public tabs (#PR)

## Summary
- Rewrite `public.templates` schema with ownership + visibility + license + age-rating columns.
- 6 new RLS policies — every user reads platform defaults + public published + own; only writes own.
- `/app/templates` rebuilt: tabs Verejné / Moje, Duplikovať / Upraviť / Vymazať row actions.
- 15 default templates seeded as platform-owned rows (`owner_id IS NULL`).
- Slovak i18n strings + a11y (keyboard nav, focus trap, ARIA).
- Tests: unit + component + DB SQL contract + e2e smoke stub.

## Post-merge SQL
... (paste self-check from E44.1) ...

## Test plan
- [ ] Lint 0/0
- [ ] `npm test` green
- [ ] `npm run build` ✓
- [ ] Manual: as a fresh user, see 15 defaults; duplicate one; edit it; delete it.
- [ ] Manual: try to UPDATE another user's row via Supabase REST → 403.

🤖 Generated with Claude Code
```
