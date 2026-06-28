# Visual regression

Playwright `toHaveScreenshot` diffing on stable public pages. Catches what the
assertion suite can't: Tailwind/Preflight regressions, token drift, layout
shifts that break the page without breaking a locator.

## Why no baselines are committed yet

Screenshots are **OS-specific** (Playwright suffixes them `-<platform>.png`) and
the app renders a root error boundary outside the full CI env, so baselines
generated on a dev laptop are both wrong and the wrong platform. They must be
seeded on the Linux CI runner.

## Activate (one-time)

1. Run the **Visual regression** workflow with `update_baselines: true`
   (Actions → Visual regression → Run workflow), or just open any PR — the job
   self-seeds when no `-linux` baseline exists and passes with a notice.
2. Download the `visual-baselines-<run_id>` artifact.
3. Commit its PNGs under `e2e/visual/public-pages.spec.ts-snapshots/`.

From then on every run diffs against them; a real visual change fails the
(non-blocking) workflow and uploads a diff report for review. Re-baseline an
intentional change the same way (`update_baselines: true`) or locally in the CI
OS with `npx playwright test --project=visual --update-snapshots`.
