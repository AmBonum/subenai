// E48 incident response — production smoke test.
//
// Submits a tagged ticket against https://subenai.sk and asserts the full
// pipeline completes end-to-end:
//   CF Function → Turnstile siteverify → Supabase RPC → email dispatch
//
// THE PROBLEM THIS SOLVES:
//   The existing kontakt-flow.spec.ts mocks /api/support-ticket-create at the
//   network layer, so it never invokes the real CF function or the production
//   Supabase RPC. This spec hits the real stack and fails if any layer is absent
//   (e.g. the 42883 undefined_function incident would have been caught here).
//
// TAG: Subject "[CI-SMOKE]" — a service-role cleanup cron removes matching rows
// from support_tickets within 1h (see tasks/POST-MIGRATION-CHECKLIST.md §smoke).
//
// RUNS ONLY WHEN CI_PROD_SMOKE=1 is set. Guards against accidental local fires.
//
// SCHEDULED in .github/workflows/prod-smoke.yml (workflow_dispatch only until
// the user enables the cron schedule — see the workflow file comment).
//
// TURNSTILE NOTE:
//   For this spec to pass without manual CAPTCHA interaction we rely on
//   Cloudflare's always-pass test site key (1x00000000000000000000AA).
//   Configure the /kontakt route to accept the test site key when
//   CI_PROD_SMOKE=1 is set (or use a dedicated smoke Turnstile site with
//   the always-pass test secret 1x0000000000000000000000000000000AA).
//   Without test keys, the submit button stays disabled and the test times out.
//   See: https://developers.cloudflare.com/turnstile/reference/testing/

import { test, expect } from "@playwright/test";
import { KontaktPage } from "../../poms/support/KontaktPage";

test.skip(!process.env.CI_PROD_SMOKE, "prod smoke only — set CI_PROD_SMOKE=1 to enable");

test.describe("prod smoke — /kontakt full pipeline", () => {
  test("submits real ticket to prod, gets ticket_id in success state", async ({ page }) => {
    const kontakt = new KontaktPage(page);

    // The prod-smoke playwright project sets baseURL=https://subenai.sk.
    await page.goto("/kontakt");

    // Wait for the form root to mount.
    await kontakt.root.waitFor({ state: "visible", timeout: 20_000 });

    // Wait for Turnstile widget slot to be present. If the always-pass test
    // key is configured the token is issued automatically within a few seconds;
    // if not, the submit button stays disabled and the last expect() times out
    // with a clear message rather than a cryptic selector error.
    await kontakt.turnstileSlot.waitFor({ state: "attached", timeout: 30_000 });

    await kontakt.subjectInput.fill("[CI-SMOKE] automated daily check");

    // Select "question" category — always-valid for smoke.
    await kontakt.categorySelect.selectOption("question");

    await kontakt.bodyTextarea.fill(
      "Production smoke from Playwright CI. This ticket is auto-archived within 1h. If you see this in the queue it means the cleanup cron is not running.",
    );

    await kontakt.emailInput.fill("ci-smoke@subenai.sk");

    // Submit button is disabled until Turnstile resolves a token.
    // Generous timeout — the always-pass test key typically resolves in <3s
    // but CF CDN cold-starts can add latency.
    await expect(kontakt.submitButton).toBeEnabled({
      timeout: 30_000,
    });

    await kontakt.submitButton.click();

    // Assert success state visible — proves the full pipeline ran:
    // CF function validated Turnstile, called submit_support_ticket() RPC,
    // and got back a ticket_id.
    await expect(kontakt.successState).toBeVisible({
      timeout: 15_000,
    });

    const ticketId = await kontakt.successTicketId.textContent();
    // A real ticket_id is a UUID v4 from the DB — 8-4-4-4-12 hex groups.
    expect(ticketId?.trim()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
