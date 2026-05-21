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

**Last reviewed:** 2026-05-22 (post-E37 epic close-out).

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

### 8 deferred should-have Playwright TCs (test/E37-playwright-should-have-pt2)

⚪ **Deferred** — needs cross-epic shared infrastructure not yet built.

Already shipped: 19 must-have ([#138](https://github.com/AmBonum/subenai/pull/138)) + 10 mechanical should-have ([#139](https://github.com/AmBonum/subenai/pull/139)) = 29 / 29 plan scenarios covered.

Still deferred:
- TC-18/19/20 (graceful empty/error handling) — needs `page.route()` interception of Supabase RPCs (could be a shared `mocks/api/platform-packs.ts` helper)
- TC-22-25 (composer pack chip flows) — needs `ComposerPage` POM extension for chip toggle + URL-config decoder
- TC-28 (XSS payload) — better grouped with the E48 security TC pyramid in its own follow-up

**Outcome that closes this:** ship a `test/E37-playwright-should-have-pt2` PR after one of the cross-epic helpers above is available. Low priority — the must-have set + the 10 mechanical should-have already covers the highest-value scenarios.

---

## Stale plan statuses (code shipped, plan never closed)

### E35 — Security compliance audit

🟡 **Needs closure review.**

Plan at `tasks/PLAN-2026-05-20-E35-security-compliance-audit.md` says
"🟡 In progress — branch `claude/nice-khorana-68a8b9`". That branch
does NOT exist locally or on the remote (verified 2026-05-22). The
intended scope appears to have been absorbed by the E48 security work:
- [#130](https://github.com/AmBonum/subenai/pull/130) — 48 security TCs across 9 attack categories
- [#133](https://github.com/AmBonum/subenai/pull/133) — security hardening (JWT rate-limit collision + PostgREST injection + PDF filter + 5 more)
- [#137](https://github.com/AmBonum/subenai/pull/137) — attachment TOCTOU race fix

**Outcome that closes this:** read the E35 plan's actual scope list, cross-reference against E48 deliverables, and either:
- (a) flip E35 to ✅ DELIVERED with PR links if E48 covered it, OR
- (b) extract the gap items into a fresh `PLAN-*-E35-security-residual.md` if there's anything left.

---

## Plans never started (no Status line)

⚪ **All deferred until a product-owner decision.** None of these have an owner or a started branch.

| Plan | Theme | Notes |
|---|---|---|
| `PLAN-2026-04-25-rast-a-vzdelavanie.md` | Growth + education roadmap | Older strategy doc, possibly superseded |
| `PLAN-2026-04-26-custom-tests-sponsorship.md` | Custom test sponsorship model | Older, possibly superseded by composer flow |
| `PLAN-2026-05-17-admin-hub-integration.md` | Admin hub integration | Likely superseded by E36 (admin audit, shipped) |
| `PLAN-2026-05-19-E17-backlinks.md` | E17 — backlinks system | Never owned |
| `PLAN-2026-05-19-E19-schools-senior-rework.md` | E19 — schools page rework | Never owned |
| `PLAN-2026-05-19-E20-selective-e2e-ci.md` | E20 — selective e2e CI runs | Never owned |
| `PLAN-2026-05-19-E21-doc-visualization.md` | E21 — doc visualisation | Never owned |
| `PLAN-2026-05-19-blog-content-engine.md` | Blog content engine | Never owned |

**Outcome that closes this:**
- For each, either bump the status to 🟢 ready (= someone picks it up next) or move the file to `tasks/archive/` (= explicitly deferred indefinitely).
- A batch `chore(plans): archive 8 never-started plans` PR would be the cleanest landing.

---

## Plans in flight / awaiting approval

### E38 — Results evolution

🟡 **Plan draft.** `tasks/PLAN-2026-05-20-E38-results-evolution.md` says
"awaiting approval before implementation". Distinct from
`PLAN-2026-05-20-E38-retention-crons.md` (✅ shipped) — two plans share
the E38 prefix, which is a numbering collision worth resolving.

**Outcome that closes this:** product-owner read-through + go/no-go + (if go) start a branch and flip status to 🟢.

### E45 — Test detail editor — Phase 4 close-out

🟢 **Ready to ship.** Plan says "Phase 4 (security review fixes + Playwright e2e + close-out) open as the final PR". Security review report exists at `tasks/E45-security-review-2026-05-21.md` (0 HIGH, 2 MEDIUM fixed, 1 LOW fixed, 1 contract-drift documented).

**Outcome that closes this:** the Phase 4 PR (if not yet open) gets opened + merged.

---

## How to add an entry

```markdown
### <Short name>

🟡|🔴|🟢|⚪ **<One-line status>**

<2-3 sentences of context. Link to the relevant `PLAN-*.md` or PRs if any.>

**Outcome that closes this:** <single concrete action that removes the entry from this file>.
```

Keep entries terse. If something needs more than 3 paragraphs, it has graduated to needing its own `PLAN-*.md`.
