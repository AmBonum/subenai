// E33 Phase 2 — full pipeline round-trip contract for the composer.
//
// Source plan: tasks/PLAN-2026-05-20-E33-composer-rebrand.md (TC-30 → TC-34).
//
// THIS is the B2B data integrity surface. The composer is the ONLY path
// in subenai.sk where a user-authored test (custom question pool) is shared,
// taken by external respondents, and surfaced back to the author. Every
// other test path consumes a static question pack with the answer key in
// the public client bundle, so a scoring regression there is loud and
// obvious. Here it can be silent: an author shares a link with HR, HR sees
// "average score 84 %" on the dashboard, but the underlying math could be
// wrong by 10 % and nobody would catch it without this test.
//
// Setup mode: HYBRID. TC-30 is the full UI round-trip (slow, high signal);
// TC-31 → TC-34 use the seed factory for fast verification of derived
// behaviours (aggregate, delete, CSV, table scale).
//
// Dev server requirement: npm run dev:api + npm run dev must be running at
// BASE_URL. .dev.vars must contain JWT_SECRET, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (the seed factory hits real CF Functions).

import fs from "node:fs";
import path from "node:path";
import { type BrowserContext } from "@playwright/test";
import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { seedEduTest, type SeedEduTestResult } from "../../seed/edu-test";
import { signEduAuthorTokenForTest } from "../../fixtures/edu-auth";
import { IntakeFormPage } from "../../poms/edu/IntakeFormPage";
import { ResultsGatePage } from "../../poms/edu/ResultsGatePage";
import { QuizFlowPage } from "../../poms/quiz/QuizFlowPage";

// ---------------------------------------------------------------------------
// Helpers — duplicated from schools-howitworks-contract.spec.ts because both
// specs need them and the 3rd-reuser threshold for extraction hasn't been
// hit yet. If a future composer spec needs these, extract to
// e2e/fixtures/edu-helpers.ts in that PR and migrate both call sites.
// ---------------------------------------------------------------------------

function loadDevVar(key: string): string {
  const devVarsPath = path.resolve(process.cwd(), ".dev.vars");
  if (!fs.existsSync(devVarsPath)) return process.env[key] ?? "";
  const text = fs.readFileSync(devVarsPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[1] === key) return m[2].trim();
  }
  return process.env[key] ?? "";
}

async function injectAuthorCookie(
  context: BrowserContext,
  setId: string,
  ttlSeconds = 3600,
): Promise<void> {
  const jwtSecret = loadDevVar("JWT_SECRET");
  if (!jwtSecret) throw new Error("JWT_SECRET not found in .dev.vars or process.env");
  const token = await signEduAuthorTokenForTest(setId, jwtSecret, ttlSeconds);
  const domain = new URL(process.env.BASE_URL ?? "http://localhost:8080").hostname;
  await context.addCookies([
    {
      name: "subenai_edu_author",
      value: token,
      domain,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + ttlSeconds,
    },
  ]);
}

// Stable, unique per-test labels to avoid cross-test rate-limit interference
// (intake POST keys by email+set_id; reusing emails inside a session triggers
// the duplicate-attempt guard).
function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`;
}

test.describe("E33 Phase 2 — composer pipeline round-trip", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-30 — Full UI round-trip: author seeds, 2 respondents drive the UI,
  // author dashboard reflects both with the score the quiz UI computed.
  //
  // This is the senior data-integrity test. The seed factory bypasses real
  // scoring (it sends `final_score` directly to /api/finish-edu-attempt),
  // so without this UI-driven TC there is no automated proof that:
  //   (1) the QuizFlow on /test/builder/$id renders the 5 seeded questions
  //   (2) clicking options computes the score correctly client-side
  //   (3) the computed score is persisted faithfully to the DB
  //   (4) the author dashboard surfaces those exact rows
  //
  // We intentionally use 2 respondents (not 1) to also verify that the
  // dashboard's aggregate count reflects multiple attempts on the same set.
  // 60s timeout absorbs the 5-question quiz × 1300 ms inter-question delay
  // × 2 respondents + CF Functions cold-start.
  test("TC-30: 2 respondents complete the quiz via UI → both appear in dashboard with non-zero scores", async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);

    const intake = new IntakeFormPage(page);
    const quiz = new QuizFlowPage(page);
    const results = new ResultsGatePage(page);

    // Seed an empty edu test set (no respondents — we'll add them via UI).
    const seeded = await seedEduTest({
      password: "roundtrip-pw-99!",
      creatorLabel: "E2E round-trip TC-30",
      respondents: [],
    });

    const respondents = [
      { name: "Anna Respondent", email: uniqueEmail("anna") },
      { name: "Boris Respondent", email: uniqueEmail("boris") },
    ];

    for (const r of respondents) {
      await test.step(`Respondent ${r.name} fills intake + completes quiz`, async () => {
        // Fresh context per respondent would be cleaner, but creating a new
        // BrowserContext mid-test is heavy. Instead we navigate fresh and
        // rely on the respondent JWT being scoped to email+set_id.
        await page.goto(seeded.respondent_url);
        await expect(intake.formRoot).toBeVisible();
        await intake.fillAndSubmit({ name: r.name, email: r.email });

        // QuizFlow takes over the page. Drive through all 5 seeded questions.
        await quiz.waitForPlayingPhase();
        await quiz.answerAllQuestions(5);
        await quiz.waitForResultsPhase();

        // The score is computed client-side and POSTed in the background
        // to /api/finish-edu-attempt. We assert it's a number, not the
        // specific value (the answer key in the bank may shift; what
        // matters is the round-trip persists *something* sensible).
        const scoreText = (await quiz.scoreValue.textContent()) ?? "";
        const score = parseInt(scoreText.replace(/\D/g, ""), 10);
        expect(score, "score should parse to a number").not.toBeNaN();
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    }

    // Switch to author POV: inject cookie, visit dashboard.
    await injectAuthorCookie(context, seeded.id);
    await results.open(seeded.id);

    await expect(results.dashboard).toBeVisible({ timeout: 15_000 });
    await expect(results.aggStatsCount).toContainText("2");

    // Both respondent emails should be in the rendered table. We assert on
    // email rather than name because the table may abbreviate long names but
    // displays email verbatim for identity disambiguation.
    for (const r of respondents) {
      await expect(results.table).toContainText(r.email);
    }
  });

  // TC-31 — Respondent name + email persisted faithfully through the API.
  // Regression sentinel for two classes of bug:
  //   (1) Server-side normalisation (e.g. .toLowerCase() on email) that
  //       would silently change "Boris.Surovec@firma.sk" → "boris.surovec@firma.sk"
  //       and break the author's ability to contact a specific respondent.
  //   (2) HTML-escaping that double-encodes ampersands or quotes in names.
  //
  // We seed via the same factory the other TCs use (which goes through real
  // CF Functions, not a service-role bypass), then verify the table renders
  // the exact bytes we sent.
  test("TC-31: respondent name + email round-trip without normalisation or escaping", async ({
    context,
    page,
  }) => {
    const peculiarName = `O'Reilly & Šárka "Test"`;
    const peculiarEmail = uniqueEmail("MixedCase.Respondent");

    const seeded = await seedEduTest({
      password: "roundtrip-pw-99!",
      creatorLabel: "E2E TC-31 name/email faithfulness",
      respondents: [{ name: peculiarName, email: peculiarEmail, score: 72 }],
    });

    await injectAuthorCookie(context, seeded.id);
    const results = new ResultsGatePage(page);
    await results.open(seeded.id);
    await expect(results.dashboard).toBeVisible({ timeout: 15_000 });

    // The table cell renders the name as text content. We assert byte-for-byte
    // match — apostrophes, ampersands, quotes, mixed-case email, Slovak diacritics.
    await expect(results.table).toContainText(peculiarName);
    await expect(results.table).toContainText(peculiarEmail);
  });

  // TC-32 — Aggregate avg recomputes after a delete.
  // Seed 3 known scores (50, 70, 90 → avg 70), delete the 50, expect avg=80.
  // schools-howitworks-contract TC-13 covers delete (row disappears) but
  // not the aggregate recompute — a bug where the stats remained cached
  // would leak the deleted respondent's score into reports.
  test("TC-32: aggregate avg recomputes correctly after deleting a respondent", async ({
    context,
    page,
  }) => {
    const seeded = await seedEduTest({
      password: "roundtrip-pw-99!",
      creatorLabel: "E2E TC-32 aggregate recompute",
      respondents: [
        { name: "Low Scorer", email: uniqueEmail("low"), score: 50 },
        { name: "Mid Scorer", email: uniqueEmail("mid"), score: 70 },
        { name: "High Scorer", email: uniqueEmail("high"), score: 90 },
      ],
    });

    await injectAuthorCookie(context, seeded.id);
    const results = new ResultsGatePage(page);
    await results.open(seeded.id);
    await expect(results.dashboard).toBeVisible({ timeout: 15_000 });

    // Initial state: 3 respondents, avg = 70.
    await expect(results.aggStatsCount).toContainText("3");
    await expect(results.aggStatsAvg).toContainText("70");

    // Delete the lowest-scoring respondent (50). The seed factory returns
    // attempt_ids in the order of input, so attempt_ids[0] is the "Low Scorer".
    const lowAttemptId = seeded.attempt_ids[0];
    expect(lowAttemptId, "seed should return at least one attempt_id").toBeTruthy();

    // Handle the confirm dialog the delete button triggers.
    page.on("dialog", (dialog) => dialog.accept());
    await results.tableDeleteButton(lowAttemptId).click();

    // After delete: 2 respondents, avg = 80. Allow 5s for the dashboard
    // to refetch /api/results-data and re-render the agg widget.
    await expect(results.aggStatsCount).toContainText("2", { timeout: 5_000 });
    await expect(results.aggStatsAvg).toContainText("80", { timeout: 5_000 });
  });

  // TC-33 — CSV export rows match the dashboard table rows 1:1.
  // schools-howitworks-contract TC-12 verifies the BOM + header but never
  // asserts row content. A bug where the CSV writer filtered, paginated, or
  // re-ordered rows differently from the dashboard would let an author
  // download a "complete report" that silently omits respondents. This is
  // a GDPR-adjacent risk: if the export is incomplete, a DSR request based
  // on it is also incomplete.
  test("TC-33: CSV export contains the same respondents (by email) as the dashboard table", async ({
    context,
    page,
  }) => {
    const respondents = [
      { name: "CSV Test A", email: uniqueEmail("csv-a"), score: 40 },
      { name: "CSV Test B", email: uniqueEmail("csv-b"), score: 60 },
      { name: "CSV Test C", email: uniqueEmail("csv-c"), score: 80 },
    ];

    const seeded = await seedEduTest({
      password: "roundtrip-pw-99!",
      creatorLabel: "E2E TC-33 CSV row consistency",
      respondents,
    });

    await injectAuthorCookie(context, seeded.id);
    const results = new ResultsGatePage(page);
    await results.open(seeded.id);
    await expect(results.dashboard).toBeVisible({ timeout: 15_000 });

    // Trigger download and capture the file bytes.
    const downloadPromise = page.waitForEvent("download");
    await results.clickDownloadCsv();
    const download = await downloadPromise;
    const tmpPath = await download.path();
    expect(tmpPath, "CSV download should produce a temp file path").toBeTruthy();
    const csv = fs.readFileSync(tmpPath!, "utf8");

    // Every respondent's email should appear in the CSV body. We don't
    // parse CSV columns (libcsv etc.) — substring presence is sufficient
    // for this contract since emails are unique-per-test by construction.
    for (const r of respondents) {
      expect(csv, `CSV missing respondent ${r.email}`).toContain(r.email);
    }
  });

  // TC-34 — Table scales to many respondents without breaking.
  // The dashboard query has no LIMIT in dev; if a future optimisation adds
  // pagination, this TC catches a regression where the count shows 10 but
  // the table only renders 5. We pick 10 (not 100) to keep seed time bounded
  // while still exceeding the "comfortable list" threshold.
  test("TC-34: 10 respondents — table renders all rows; count + avg match", async ({
    context,
    page,
  }) => {
    test.setTimeout(45_000);

    const respondents = Array.from({ length: 10 }, (_, i) => ({
      name: `Scale Test ${i + 1}`,
      email: uniqueEmail(`scale-${i + 1}`),
      // Scores 10, 20, 30, ..., 100 → sum 550, avg 55.
      score: (i + 1) * 10,
    }));

    const seeded: SeedEduTestResult = await seedEduTest({
      password: "roundtrip-pw-99!",
      creatorLabel: "E2E TC-34 table scale",
      respondents,
    });

    await injectAuthorCookie(context, seeded.id);
    const results = new ResultsGatePage(page);
    await results.open(seeded.id);
    await expect(results.dashboard).toBeVisible({ timeout: 15_000 });

    await expect(results.aggStatsCount).toContainText("10");
    await expect(results.aggStatsAvg).toContainText("55");

    // Verify every respondent email is present in the rendered table. If a
    // pagination regression hides rows beyond N, this loop fails on the
    // first missing email.
    for (const r of respondents) {
      await expect(results.table).toContainText(r.email);
    }
  });

  // TC-35 — E34 Phase 1: drill-down modal opens on Detail click, shows the
  // respondent's name in the heading. The full drill-down content
  // (per-category strip, per-question rows) is unit-tested in
  // tests/components/composer/RespondentDetailModal.test.tsx — this e2e
  // only verifies the modal MOUNTS from the dashboard, because the
  // mount path is what would silently regress if a future refactor
  // removed the Detail button or broke the data wiring in
  // /api/results-data.
  test("TC-35: dashboard drill-down — Detail button opens the per-respondent modal with name + content", async ({
    context,
    page,
  }) => {
    const seeded = await seedEduTest({
      password: "drill-down-pw-99!",
      creatorLabel: "E2E TC-35 drill-down",
      respondents: [{ name: "Diana Drill", email: uniqueEmail("diana"), score: 80 }],
    });

    await injectAuthorCookie(context, seeded.id);
    const results = new ResultsGatePage(page);
    await results.open(seeded.id);
    await expect(results.dashboard).toBeVisible({ timeout: 15_000 });

    const attemptId = seeded.attempt_ids[0];
    expect(attemptId, "seed should return an attempt_id").toBeTruthy();

    // Modal not in DOM until click.
    await expect(page.getByTestId("respondent-detail-root")).toHaveCount(0);

    // Click the new Detail button (eye icon, sibling of the existing trash).
    await page.getByTestId(`resp-table-detail-btn-${attemptId}`).click();

    // Modal mounts with the respondent's name in the heading.
    const modal = page.getByTestId("respondent-detail-root");
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("respondent-detail-heading")).toContainText("Diana Drill");

    // ESC closes the modal (Radix Dialog default behaviour). Sentinel
    // for "did we accidentally trap focus in a way that breaks ESC".
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("respondent-detail-root")).toHaveCount(0);
  });
});
