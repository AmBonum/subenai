# Backlog — deferred + open work tracking

**Purpose:** explicit, single-source-of-truth tracking for items that
are NOT in an active epic plan but DO need a decision before they can
ship, get closed, or get archived. Keep this file short — anything
larger than ~3 paragraphs belongs in its own `PLAN-*.md`.

**How to use:**
- Each entry has a status (🟡 needs decision / 🔴 blocked / 🟢 ready to start / ⚪ deferred).
- Each entry has a one-sentence outcome that closes it ("merge this PR" / "delete this file" / "approve this plan" / etc.).
- When something here gets a real plan, move it to a `PLAN-*.md` and link from this file.
- When something here ships, delete the entry (the git log keeps the history).

**Last reviewed:** 2026-05-22 (post-E37 + post-E35/E45 closure sweep + plan-archive pass).

---

## E37 follow-ups (the only items still labelled "deferred" in the closed E37 plan)

### Phase H — blog frontmatter `related_test_slug` wiring (81 MDX files)

🟡 **Needs decision** — requires SEO writer judgement per blog post.

The Phase A audit (2026-05-20) produced a primary-pack mapping per post:
`vseobecny 29 · eshop 8 · socialne-siete 8 · heslo-2fa 7 · rodicia 7 · …`
That mapping is NOT in the repo — it lived in the agent's output buffer.

**Outcome that closes this:**
- Either someone re-runs the blog→pack mapping pass (heuristic by
  category + tags + body keywords, then human spot-check) and produces
  a CSV of (mdx_slug, target_pack_slug, confidence) → then a follow-up
  PR applies it as MDX frontmatter edits.
- OR explicitly drop the feature (the catalog UX is already complete
  without per-post cross-links; this is a SEO-internal-linking win, not
  a user-blocking gap).

---

## Plans archived 2026-05-22 (no status, no owner, indefinitely deferred)

Four plans had no Status line and no started branch. They were moved to
`tasks/archive/` so the active `tasks/` directory only contains plans
with a real status (open / in flight / delivered).

| Archived file | Theme | Why archived |
|---|---|---|
| `archive/PLAN-2026-04-25-rast-a-vzdelavanie.md` | Growth + education roadmap | Older strategy doc, superseded by E37 (catalog) + E44 (templates) |
| `archive/PLAN-2026-04-26-custom-tests-sponsorship.md` | Custom test sponsorship model | Superseded by E44 marketplace (PRs #70/#76/#118/#119) |
| `archive/PLAN-2026-05-17-admin-hub-integration.md` | Admin hub integration | Superseded by E36 admin audit (shipped) |
| `archive/PLAN-2026-05-19-blog-content-engine.md` | Blog content engine | Never owned; blog work continues ad-hoc per post |

To resurrect any of these, `git mv` it back to `tasks/` and add a Status line.

---

## How to add an entry

```markdown
### <Short name>

🟡|🔴|🟢|⚪ **<One-line status>**

<2-3 sentences of context. Link to the relevant `PLAN-*.md` or PRs if any.>

**Outcome that closes this:** <single concrete action that removes the entry from this file>.
```

Keep entries terse. If something needs more than 3 paragraphs, it has graduated to needing its own `PLAN-*.md`.
