# Tasks

This directory holds the **planning backlog** for subenai — epics, user
stories, and their breakdown into implementation, test, documentation
and review subtasks.

## Structure

```
tasks/
├── README.md                                    ← conventions + DoR/DoD pointer (this file)
├── PLAN-2026-04-25-rast-a-vzdelavanie.md       ← plan index (epic map, exec order, open questions)
└── stories/                                     ← one file = one user story
    ├── E1.1-consent-link-closes-dialog.md
    ├── E2.1-attempts-schema-growth-fields.md
    ├── E2.2-survey-question-component.md
    ├── E2.3-add-growth-survey-questions.md
    ├── E3.1-persist-answers-jsonb.md
    ├── E3.2-extract-answer-feedback-component.md
    ├── E3.3-share-page-answer-review-ui.md
    ├── E4.1-data-trap-copy-and-taxonomy.md
    ├── E4.2-trap-dialog-component.md
    ├── E4.3-trap-dialog-integration.md
    ├── E5.1-course-content-schema.md
    ├── E5.2-courses-index-route.md
    ├── E5.3-course-onepager-template.md
    ├── E5.4-course-sms-smishing.md
    ├── E5.5-course-email-phishing.md
    ├── E5.6-course-vishing.md
    ├── E5.7-course-marketplace.md
    ├── E5.8-course-investment-scams.md
    ├── E5.9-course-romance-scams.md
    ├── E5.10-course-bec-workplace.md
    ├── E5.11-course-data-hygiene.md
    ├── E5.12-sitemap-seo.md
    └── E5.13-navigation-links.md
```

## Conventions

- **Every user story is INVEST**: Independent, Negotiable, Valuable,
  Estimable, Small, Testable. A story that cannot be completed in
  1–3 days of development must be split into smaller ones.
- **Every story has four subtasks**: `Implementation`, `Tests`,
  `Documentation`, `Code review`. None ship as done without all four.
- **Code review** runs in **fresh context** (subagent / another
  developer). The reviewer does not know the premise — the story
  prompt must stand on its own.
- **Effort labels**:
  - `XS` ≤ 2h · `S` ≤ ½ day · `M` ≤ 2 days · `L` ≤ 1 week ·
    `XL` split into smaller
- **Priorities**:
  - `P0` (blocker, fix today) · `P1` (must) ·
    `P2` (should) · `P3` (nice)
- **Dependencies**: declared explicitly in the `Závislosti:` section
  of each story (story IDs). _(Legacy stories use the Slovak
  heading; new stories should use `Dependencies:`.)_
- **Story ID scheme**: `EPIC-{n}.{m}` — `n` is the epic, `m` the
  ordinal within the epic. After completion the heading becomes
  `~~ID Title~~ ✅`.
- **Status emoji**: 🟡 Ready / ⛔ Blocked / 🚧 In progress /
  ✅ Done.
- **Static content files** (courses in `src/content/courses/`) are
  documentation in themselves — they don't need an extra README.

## Active plans

| File | Contents | Status |
|---|---|---|
| [PLAN-2026-04-25-rast-a-vzdelavanie.md](./PLAN-2026-04-25-rast-a-vzdelavanie.md) | 5 epics, 23 stories: consent bug, growth survey, answer review, data-trap edu popup, courses section | 🟡 Plan approved, awaiting kickoff |
| [stories/E53-scam-chat-agent.md](./stories/E53-scam-chat-agent.md) | E53, 9 stories: AI scam-check chat assistant — Workers AI free tier, RAG over site content, triage + police-report PDF, photo evidence with 30-min TTL, role-aware disclosure | 🚧 All 9 stories merged to `main`; pending live prod-ops (Vectorize index + bindings + first `rag:index`) — see [E53-runbook.md](./E53-runbook.md) §1 |

## Planning process

1. **Discovery** — read existing code relevant to the feature.
   A plan not anchored in real code is a guess, not a plan.
2. **Story breakdown** — feature → epics → user stories → subtasks.
3. **Product owner approval** — no implementation without explicit
   sign-off on acceptance criteria.
4. **Execution** — story by story, each one ends with a green CR +
   green build. No batch merges without review.
5. **Archive** — completed plans move to `tasks/done/{year}/`.

## Definition of Ready / Definition of Done

The canonical checklist lives in a separate file (English, like
CLAUDE.md):

📋 **[`tasks/DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md)** — covers:

- § 1 — Definition of Ready (before starting a story)
- § 2 — Story DoD (per-story: implementation, unit tests, docs, CR)
- § 3 — Feature / Epic DoD (Playwright integration + e2e tests, schema
  + secrets, privacy, a11y, perf, security review)
- § 4 — test pyramid (what goes where — Vitest vs Playwright integration
  vs e2e)
- § 5 — Pre-merge gates (lint / test / build / e2e green)
- § 6 — Post-merge verification (smoke check, migrations, monitoring,
  rollback)
- § 7 — Cross-cutting concerns (DB schema / new API endpoint / new
  route / PII / third-party service)
- § 8 — Quick reference scenarios
- § 9 — Anti-patterns

Every story in `tasks/stories/` references this document — no story is
marked ✅ Done without satisfying § 2, and no epic merges without § 3.
