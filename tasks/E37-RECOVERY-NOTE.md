# E37 — Recovery note

**Created:** 2026-05-21
**Status:** ⚠️ Salvaged content — schema dependency NOT yet on main. Do not run `E37_SEED.sql` directly without first applying the missing migration.

## Context

`feature/E37-tests-coverage` was a stale local branch with 11 unmerged commits adding the *DB-native question pack architecture* (Phase B–E) and 15 question packs (heslo-2fa, ai-deepfake, socialne-siete, rodicia, skoly, zdravotnictvo + 9 platform packs). The branch never landed because main moved 45 commits ahead and the per-commit `DEPLOY_SETUP.sql` edits would conflict massively against the current version.

To avoid losing the work, this commit preserves the two standalone artefacts:

- `E37_SEED.sql` — the consolidated seed (1,644 lines) containing every question pack as `INSERT` statements
- `tasks/PLAN-2026-05-20-E37-tests-coverage.md` — the full original epic plan (316 lines)

## Why this is *not* deployable as-is

`E37_SEED.sql` writes into a table that **does not exist on main**:

| Object | On main? | Origin |
|---|---|---|
| `platform_pack_metadata` table | ❌ No | `feature/E37-tests-coverage` commit `f31012a` (Phase B) |
| `questions.sources_jsonb` column | ❌ No | same commit |
| Helper RPCs (`get_platform_pack_questions`, etc.) | ❌ No | same commit |

Running `E37_SEED.sql` today against production Supabase will fail with `relation "platform_pack_metadata" does not exist`.

## What you need to do to actually deploy E37

1. **Decide whether E37 is still worth shipping.** It was scoped on 2026-05-20; check whether the question-pack content + the platform_pack_metadata architecture fits the current platform direction (might supersede existing pack patterns).
2. If yes, create a **fresh migration** at `supabase/migrations/<timestamp>_e37_platform_pack_metadata.sql` adapting commit `f31012a` to the *current* schema. Don't cherry-pick — the surrounding tables on main have evolved since.
3. Re-apply the seed via the new migration's `INSERT … ON CONFLICT` blocks, copying from `E37_SEED.sql` here.
4. Write tests for the new RPCs (commit `f31012a` originally shipped them; you'll need to reconstruct).
5. Once the migration applies cleanly to the staging Supabase project, ship as a feature PR (`feature/E37-redux-pack-architecture`).

## What's safe to do today

- Keep these two files in `main` so the content isn't lost in a future repo migration.
- Use `tasks/PLAN-2026-05-20-E37-tests-coverage.md` as a planning reference. It contains the original PII/scope/decision matrix.
- Use `E37_SEED.sql` as the **source of truth for the question content** — even if the table around it changes, the questions/options/explanations inside the INSERTs are reusable.

## Decision log

- **Why not cherry-pick the 11 commits?** Per-commit `DEPLOY_SETUP.sql` patches assume a `DEPLOY_SETUP.sql` 45 commits older than today's; resolving the textual conflicts would take longer than rewriting the migration from scratch.
- **Why preserve in `main` instead of leaving on the stale branch?** Branches without an open PR get pruned + the 90-day reflog window doesn't survive a `gc --aggressive`. Files on `main` are durable.
- **Why no `CHANGELOG.md` entry?** This is internal preservation — not user-facing. No production behaviour changes.
