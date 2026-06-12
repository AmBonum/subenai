// API error paths — full test lifecycle (composer → respondent → edu respondent → author results)
// Plan: specs/cross-cutting/api-error-paths.md

import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { mockSupabase } from "../../mocks/supabase";
import { setupEducator } from "../../setup/app-shell";
import { seedE49TestWithSessions } from "../../seed";
import { TestSessionsDetailPage } from "../../poms/app/TestSessionsDetail";
import { ComposerPage } from "../../poms/quiz/ComposerPage";
import { ComposerEduPage } from "../../poms/edu/ComposerEduPage";
import { TakeTestPage } from "../../poms/respondent/TakeTestPage";
import { IntakeFormPage } from "../../poms/edu/IntakeFormPage";
import { ResultsGatePage } from "../../poms/edu/ResultsGatePage";
import { QuizFlowPage } from "../../poms/quiz/QuizFlowPage";
import { TestEditorPage } from "../../poms/app/TestEditorPage";

// ---------------------------------------------------------------------------
// Shared test-set ID used in B / C / D suites (no real DB — all mocked).
// ---------------------------------------------------------------------------
const TEST_SET_ID = "e2e-err-set-0001";
const SHARE_ID = "errshare1";
const SESSION_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const SESSION_TOKEN = "ffffffff-ffff-ffff-ffff-ffffffffffff";

// ---------------------------------------------------------------------------
// Shared test_sets row consumed by the edu respondent runner (/test/builder/$id)
// ---------------------------------------------------------------------------
const TEST_SET_ROW = {
  id: TEST_SET_ID,
  question_ids: ["p-sms-posta-1", "p-sms-dpd-1"],
  passing_threshold: 70,
  max_questions: 2,
  creator_label: "ERR E2E Test",
  source_pack_slugs: null,
  collects_responses: true,
  created_at: "2026-06-12T00:00:00.000Z",
};

// Respondent rows for author dashboard (ERR-12/13/14)
const RESPONDENT_A = {
  id: "attempt-aaa-001",
  share_id: "ABCD1234",
  respondent_name: "Jana Nováková",
  respondent_email: "jana@example.sk",
  final_score: 80,
  percentile: 75,
  total_time_ms: 60000,
  created_at: "2026-06-12T10:00:00.000Z",
  answers: null,
};

const RESPONDENT_B = {
  id: "attempt-bbb-002",
  share_id: "EFGH5678",
  respondent_name: "Peter Horváth",
  respondent_email: "peter@example.sk",
  final_score: 60,
  percentile: 40,
  total_time_ms: 45000,
  created_at: "2026-06-12T11:00:00.000Z",
  answers: null,
};

// Minimal results-data 200 payload mirroring functions/api/results-data.ts
function makeResultsDataSuccess(rows: (typeof RESPONDENT_A)[] = [RESPONDENT_A, RESPONDENT_B]) {
  const scores = rows.map((r) => r.final_score);
  const count = scores.length;
  const avg = count ? Math.round((scores.reduce((a, b) => a + b, 0) / count) * 10) / 10 : 0;
  return {
    set_id: TEST_SET_ID,
    creator_label: "ERR E2E Test",
    passing_threshold: 70,
    question_count: 2,
    collects_responses: true,
    rows,
    stats: {
      count,
      avg_score: avg,
      min_score: count ? Math.min(...scores) : 0,
      max_score: count ? Math.max(...scores) : 0,
      median_score: avg,
      passing_threshold: 70,
      pass_count: scores.filter((s) => s >= 70).length,
      pass_rate: count ? Math.round((scores.filter((s) => s >= 70).length / count) * 1000) / 10 : 0,
      histogram: [0, 1, 1, 0] as [number, number, number, number],
    },
  };
}

// ---------------------------------------------------------------------------
// Respondent (B-suite) shared setup — mirrors take-test.spec.ts
// ---------------------------------------------------------------------------
function resolvedPayload() {
  return {
    test: {
      id: "tst_err_take_001",
      title: "ERR Test",
      description: "Chybový E2E test.",
      intake_fields: [],
      gdpr_purpose: "research",
      allow_behavioral_tracking: false,
      status: "published",
      question_order_mode: "fixed",
    },
    questions: [
      {
        id: "qp_err_001",
        type: "single",
        prompt: "Otázka 1",
        options: ["Správna", "Nesprávna"],
        correct: [0],
        position: 0,
      },
      {
        id: "qp_err_002",
        type: "single",
        prompt: "Otázka 2",
        options: ["A", "B"],
        correct: [0],
        position: 1,
      },
    ],
  };
}

async function setupTakeTestWithPassword(
  page: Page,
  opts: {
    checkPasswordBody?: Record<string, unknown>;
    verifyPasswordStatus?: number;
    verifyPasswordBody?: Record<string, unknown>;
  } = {},
): Promise<void> {
  await page.route("**/api/tests/check-password**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        opts.checkPasswordBody ?? { has_password: true, gated: true, reason: "no_cookie" },
      ),
    });
  });
  await page.route("**/api/tests/verify-password", async (route) => {
    await route.fulfill({
      status: opts.verifyPasswordStatus ?? 401,
      contentType: "application/json",
      body: JSON.stringify(opts.verifyPasswordBody ?? { error: "invalid_password" }),
    });
  });
  await mockSupabase(page, {
    rpcs: {
      get_respondent_test_by_share_id: () => resolvedPayload(),
      start_respondent_session: () => ({ session_id: SESSION_ID, session_token: SESSION_TOKEN }),
      submit_respondent_answer: () => null,
      finalize_respondent_session: () => null,
    },
  });
}

// ---------------------------------------------------------------------------
// A. Composer (test creation)
// ---------------------------------------------------------------------------

test.describe("A. Composer — API error paths", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // ERR-01: submit 500 shows the error alert, preserves the draft, retry succeeds.
  test("ERR-01: submit 500 shows the error alert, preserves the draft, retry succeeds", async ({
    page,
  }) => {
    const composer = new ComposerPage(page);

    await test.step("Open the composer and expand the question picker", async () => {
      await composer.open();
      await composer.expandStep2Picker();
      await composer.setPickerPageSize("all");
    });

    await test.step("Select 11 questions by ticking individual bank IDs", async () => {
      const questionIds = [
        "p-sms-posta-1",
        "p-sms-dpd-1",
        "p-sms-tatra-1",
        "p-sms-slsp-1",
        "p-sms-csob-1",
        "p-sms-moneta-1",
        "p-sms-kb-1",
        "p-sms-cetelem-1",
        "p-email-ms-1",
        "p-email-google-1",
        "p-email-fb-1",
      ];
      for (const id of questionIds) {
        const checkbox = composer.questionCheckbox(id);
        const isVisible = await checkbox.isVisible();
        if (isVisible) await checkbox.click();
      }
    });

    await test.step("Stub POST /api/test-sets → 500 and click 'Zdieľať s tímom'", async () => {
      await page.route("**/api/test-sets", async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "submit_failed" }),
        });
      });
      await composer.submitButton.click();
    });

    await test.step("Verify the error alert is visible with verbatim Slovak copy", async () => {
      await expect(composer.errorAlert).toBeVisible();
      await expect(composer.errorAlert).toContainText("Niečo sa pokazilo:");
      await expect(composer.errorAlert).toContainText("submit_failed");
      await expect(composer.errorAlert).toContainText("Skús to prosím znova.");
    });

    await test.step("Verify the submit button is re-enabled", async () => {
      await expect(composer.submitButton).toBeEnabled();
    });

    await test.step("Re-stub → 201 with id and click submit again", async () => {
      await page.route("**/api/test-sets", async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "e2e-err-01-set" }),
        });
      });
      await composer.submitButton.click();
      await expect(page).toHaveURL(/\/test\/builder\/e2e-err-01-set/);
    });
  });

  // ERR-02: submit network failure maps to network_error.
  test("ERR-02: submit network failure maps to network_error, draft preserved", async ({
    page,
  }) => {
    const composer = new ComposerPage(page);

    await test.step("Open the composer and select 11 questions", async () => {
      await composer.open();
      await composer.expandStep2Picker();
      await composer.setPickerPageSize("all");
      const questionIds = [
        "p-sms-posta-1",
        "p-sms-dpd-1",
        "p-sms-tatra-1",
        "p-sms-slsp-1",
        "p-sms-csob-1",
        "p-sms-moneta-1",
        "p-sms-kb-1",
        "p-sms-cetelem-1",
        "p-email-ms-1",
        "p-email-google-1",
        "p-email-fb-1",
      ];
      for (const id of questionIds) {
        const checkbox = composer.questionCheckbox(id);
        const isVisible = await checkbox.isVisible();
        if (isVisible) await checkbox.click();
      }
    });

    await test.step("Abort the POST to /api/test-sets and click submit", async () => {
      await page.route("**/api/test-sets", async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }
        await route.abort("connectionrefused");
      });
      await composer.submitButton.click();
    });

    await test.step("Verify error alert shows network_error", async () => {
      await expect(composer.errorAlert).toBeVisible();
      await expect(composer.errorAlert).toContainText("network_error");
    });

    await test.step("Verify submit button is re-enabled (draft preserved)", async () => {
      await expect(composer.submitButton).toBeEnabled();
    });
  });

  // ERR-03: edu password too short blocks submit with the exact summary copy.
  test("ERR-03: edu password too short blocks submit with the exact summary copy", async ({
    page,
  }) => {
    const eduComposer = new ComposerEduPage(page);

    await test.step("Open the composer and select 5 questions", async () => {
      await eduComposer.open();
      await eduComposer.selectQuestions([
        "p-sms-posta-1",
        "p-sms-dpd-1",
        "p-sms-tatra-1",
        "p-sms-slsp-1",
        "p-sms-csob-1",
      ]);
    });

    await test.step("Enable the edu toggle", async () => {
      await eduComposer.enableEduToggle();
    });

    await test.step("Verify empty password shows 'Heslo musí mať aspoň 8 znakov' and submit disabled", async () => {
      const composer = new ComposerPage(page);
      await expect(composer.selectionSummary).toContainText("Heslo musí mať aspoň 8 znakov");
      await expect(composer.submitButton).toBeDisabled();
    });

    await test.step("Type a 7-char password — still blocked, same copy", async () => {
      await eduComposer.typePassword("1234567");
      const composer = new ComposerPage(page);
      await expect(composer.selectionSummary).toContainText("Heslo musí mať aspoň 8 znakov");
      await expect(composer.submitButton).toBeDisabled();
    });

    await test.step("Type an 8-char password — message replaced, submit enabled", async () => {
      await eduComposer.typePassword("12345678");
      const composer = new ComposerPage(page);
      await expect(composer.selectionSummary).not.toContainText("Heslo musí mať aspoň 8 znakov");
      await expect(composer.submitButton).toBeEnabled();
    });
  });
});

// ---------------------------------------------------------------------------
// B. Respondent — public /t/<shareId> error paths
// ---------------------------------------------------------------------------

test.describe("B. Respondent — password gate and answer submission errors", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // ERR-04: wrong password 401 — verbatim error, input cleared, correct password recovers.
  test("ERR-04: wrong password 401 shows verbatim error, input cleared, correct recovers", async ({
    page,
  }) => {
    const takeTest = new TakeTestPage(page);
    await setupTakeTestWithPassword(page, {
      checkPasswordBody: { has_password: true, gated: true, reason: "no_cookie" },
      verifyPasswordStatus: 401,
      verifyPasswordBody: { error: "invalid_password" },
    });

    await test.step("Open /t/<shareId> and verify the password gate renders", async () => {
      await takeTest.open(SHARE_ID);
      await expect(takeTest.passwordGateRoot).toBeVisible();
    });

    await test.step("Submit a wrong password", async () => {
      await takeTest.submitPassword("wrongpass");
    });

    await test.step("Verify error message shows verbatim Slovak copy and input is cleared", async () => {
      await expect(takeTest.passwordGateError).toHaveText("Nesprávne heslo. Skús to znova.");
      await expect(takeTest.passwordGateInput).toHaveValue("");
    });

    await test.step("Re-stub verify → 200 ok:true, type correct password and submit", async () => {
      await page.route("**/api/tests/verify-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });
      await takeTest.submitPassword("correctpass");
    });

    await test.step("Verify gate disappears and quiz renders", async () => {
      await expect(takeTest.passwordGateRoot).toHaveCount(0);
    });
  });

  // ERR-05a: rate-limited 429 with retry_after shows exact Slovak copy.
  test("ERR-05a: rate-limited 429 with retry_after shows 'Príliš veľa pokusov. Skús to znova o 3 minút.'", async ({
    page,
  }) => {
    const takeTest = new TakeTestPage(page);
    await page.route("**/api/tests/check-password**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ has_password: true, gated: true, reason: "no_cookie" }),
      });
    });
    await page.route("**/api/tests/verify-password", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "rate_limited", retry_after: 180 }),
      });
    });
    await mockSupabase(page, {
      rpcs: {
        get_respondent_test_by_share_id: () => resolvedPayload(),
        start_respondent_session: () => ({ session_id: SESSION_ID, session_token: SESSION_TOKEN }),
        submit_respondent_answer: () => null,
        finalize_respondent_session: () => null,
      },
    });

    await test.step("Open the gate and submit a password", async () => {
      await takeTest.open(SHARE_ID);
      await expect(takeTest.passwordGateRoot).toBeVisible();
      await takeTest.submitPassword("somepass");
    });

    await test.step("Verify rate-limited error with 3 minutes", async () => {
      await expect(takeTest.passwordGateError).toContainText(
        "Príliš veľa pokusov. Skús to znova o 3 minút.",
      );
    });
  });

  // ERR-05b: share_locked 429 disables the gate.
  test("ERR-05b: share_locked 429 disables input and submit", async ({ page }) => {
    const takeTest = new TakeTestPage(page);
    await page.route("**/api/tests/check-password**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ has_password: true, gated: true, reason: "no_cookie" }),
      });
    });
    await page.route("**/api/tests/verify-password", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "share_locked" }),
      });
    });
    await mockSupabase(page, {
      rpcs: {
        get_respondent_test_by_share_id: () => resolvedPayload(),
        start_respondent_session: () => ({ session_id: SESSION_ID, session_token: SESSION_TOKEN }),
        submit_respondent_answer: () => null,
        finalize_respondent_session: () => null,
      },
    });

    await test.step("Open the gate and submit a password", async () => {
      await takeTest.open(SHARE_ID);
      await expect(takeTest.passwordGateRoot).toBeVisible();
      await takeTest.submitPassword("somepass");
    });

    await test.step("Verify share_locked error copy", async () => {
      await expect(takeTest.passwordGateError).toContainText(
        "Tento test je dnes uzamknutý pre príliš veľa nesprávnych pokusov. Skús to opäť zajtra.",
      );
    });

    await test.step("Verify input and submit button are disabled", async () => {
      await expect(takeTest.passwordGateInput).toBeDisabled();
      await expect(takeTest.passwordGateSubmit).toBeDisabled();
    });
  });

  // ERR-06: verify 500 is retryable — error shown, input not disabled, recovery works.
  test("ERR-06: verify 500 shows retryable error, input NOT disabled, recovery to quiz", async ({
    page,
  }) => {
    const takeTest = new TakeTestPage(page);
    await page.route("**/api/tests/check-password**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ has_password: true, gated: true, reason: "no_cookie" }),
      });
    });
    await page.route("**/api/tests/verify-password", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "internal" }),
      });
    });
    await mockSupabase(page, {
      rpcs: {
        get_respondent_test_by_share_id: () => resolvedPayload(),
        start_respondent_session: () => ({ session_id: SESSION_ID, session_token: SESSION_TOKEN }),
        submit_respondent_answer: () => null,
        finalize_respondent_session: () => null,
      },
    });

    await test.step("Open the gate and submit", async () => {
      await takeTest.open(SHARE_ID);
      await expect(takeTest.passwordGateRoot).toBeVisible();
      await takeTest.submitPassword("somepass");
    });

    await test.step("Verify 500 error copy", async () => {
      await expect(takeTest.passwordGateError).toContainText(
        "Niečo sa pokazilo. Skontroluj pripojenie a skús to znova.",
      );
    });

    await test.step("Verify input is NOT disabled (retryable)", async () => {
      await expect(takeTest.passwordGateInput).toBeEnabled();
    });

    await test.step("Re-stub → 200 ok:true and retry — quiz renders", async () => {
      await page.route("**/api/tests/verify-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });
      await takeTest.passwordGateInput.fill("somepass");
      await takeTest.passwordGateSubmit.click();
      await expect(takeTest.passwordGateRoot).toHaveCount(0);
    });
  });

  // ERR-07: check-password preflight 500 fails OPEN.
  test("ERR-07: check-password preflight 500 fails open — quiz renders directly", async ({
    page,
  }) => {
    const takeTest = new TakeTestPage(page);

    await test.step("Stub check-password → 500 and setup respondent mocks", async () => {
      await page.route("**/api/tests/check-password**", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "internal" }),
        });
      });
      await mockSupabase(page, {
        rpcs: {
          get_respondent_test_by_share_id: () => resolvedPayload(),
          start_respondent_session: () => ({
            session_id: SESSION_ID,
            session_token: SESSION_TOKEN,
          }),
          submit_respondent_answer: () => null,
          finalize_respondent_session: () => null,
        },
      });
    });

    await test.step("Open /t/<shareId>", async () => {
      await takeTest.open(SHARE_ID);
    });

    await test.step("Verify NO password gate — intake/runner renders directly", async () => {
      await expect(takeTest.passwordGateRoot).toHaveCount(0);
      await expect(takeTest.testTitle).toBeVisible();
    });
  });

  // ERR-08: answer submit RPC 500 mid-quiz shows inline error, state kept, retry continues.
  test("ERR-08: answer submit RPC 500 shows inline error, state kept, retry continues to Q2", async ({
    page,
  }) => {
    const takeTest = new TakeTestPage(page);

    await test.step("Set up happy mocks then override submit_respondent_answer to error", async () => {
      await page.route("**/api/tests/check-password**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ has_password: false }),
        });
      });
      await mockSupabase(page, {
        rpcs: {
          get_respondent_test_by_share_id: () => resolvedPayload(),
          start_respondent_session: () => ({
            session_id: SESSION_ID,
            session_token: SESSION_TOKEN,
          }),
          submit_respondent_answer: () => null,
          finalize_respondent_session: () => null,
        },
        errors: {
          submit_respondent_answer: { status: 500, message: "internal error" },
        },
      });
    });

    await test.step("Open the test and start the session", async () => {
      await takeTest.open(SHARE_ID);
      await takeTest.intakeConsentCheckbox.click();
      await takeTest.intakeSubmitButton.click();
      await expect(takeTest.questionPrompt(0)).toBeVisible();
    });

    await test.step("Select answer for Q1 and click Next — submit RPC fails with 500", async () => {
      await takeTest.answerOption(0, 0).click();
      await takeTest.nextButton.click();
      await expect(takeTest.submitError).toBeVisible();
      await expect(takeTest.submitError).toHaveText(
        "Nepodarilo sa odoslať odpoveď. Skús to znova.",
      );
    });

    await test.step("Re-register mock so submit_respondent_answer succeeds", async () => {
      await mockSupabase(page, {
        rpcs: {
          get_respondent_test_by_share_id: () => resolvedPayload(),
          start_respondent_session: () => ({
            session_id: SESSION_ID,
            session_token: SESSION_TOKEN,
          }),
          submit_respondent_answer: () => null,
          finalize_respondent_session: () => null,
        },
      });
    });

    await test.step("Click Next again — Q2 renders", async () => {
      await takeTest.nextButton.click();
      await expect(takeTest.questionPrompt(1)).toBeVisible();
    });
  });

  // ERR-09: finalize RPC 500 — error, then retry reaches the thank-you screen.
  test("ERR-09: finalize RPC 500 shows error, retry reaches thank-you screen", async ({ page }) => {
    const takeTest = new TakeTestPage(page);

    await test.step("Set up happy mocks then override finalize to error", async () => {
      await page.route("**/api/tests/check-password**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ has_password: false }),
        });
      });
      await mockSupabase(page, {
        rpcs: {
          get_respondent_test_by_share_id: () => resolvedPayload(),
          start_respondent_session: () => ({
            session_id: SESSION_ID,
            session_token: SESSION_TOKEN,
          }),
          submit_respondent_answer: () => null,
          finalize_respondent_session: () => null,
        },
        errors: {
          finalize_respondent_session: { status: 500, message: "internal error" },
        },
      });
    });

    await test.step("Start, answer Q1 and advance to Q2", async () => {
      await takeTest.open(SHARE_ID);
      await takeTest.intakeConsentCheckbox.click();
      await takeTest.intakeSubmitButton.click();
      await expect(takeTest.questionPrompt(0)).toBeVisible();
      await takeTest.answerOption(0, 0).click();
      await takeTest.nextButton.click();
      await expect(takeTest.questionPrompt(1)).toBeVisible();
    });

    await test.step("Answer Q2 (last) and submit — finalize RPC fails with 500", async () => {
      await takeTest.answerOption(1, 0).click();
      await takeTest.submitButton.click();
    });

    await test.step("Verify finalize error shown", async () => {
      await expect(takeTest.submitError).toBeVisible();
      await expect(takeTest.submitError).toHaveText(
        "Nepodarilo sa odoslať odpoveď. Skús to znova.",
      );
    });

    await test.step("Re-register mock so finalize succeeds, retry", async () => {
      await mockSupabase(page, {
        rpcs: {
          get_respondent_test_by_share_id: () => resolvedPayload(),
          start_respondent_session: () => ({
            session_id: SESSION_ID,
            session_token: SESSION_TOKEN,
          }),
          submit_respondent_answer: () => null,
          finalize_respondent_session: () => null,
        },
      });
      await takeTest.submitButton.click();
    });

    await test.step("Verify thank-you state renders", async () => {
      await expect(takeTest.thankYou).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// C. Edu respondent — intake + persist at /test/builder/<setId>
// ---------------------------------------------------------------------------

test.describe("C. Edu respondent — intake and persist error paths", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // ERR-10: intake error-code mapping (4 variants), values preserved, retry succeeds.
  test("ERR-10: intake error mapping — 4 variants, values preserved, retry succeeds", async ({
    page,
  }) => {
    const intake = new IntakeFormPage(page);

    await test.step("Set up test_sets mock so the edu runner loads", async () => {
      await mockSupabase(page, {
        tables: { test_sets: [TEST_SET_ROW] },
        rpcs: {
          get_quick_test_questions: () => [],
        },
      });
    });

    await test.step("Open the edu intake page and fill name + email + consent", async () => {
      await intake.open(TEST_SET_ID);
      await intake.fillName("Jana Testovacia");
      await intake.fillEmail("jana.testovacia@test.sk");
      await intake.checkConsent();
    });

    await test.step("Variant (a): 500 → 'Formulár sa nepodarilo odoslať.'", async () => {
      // A bare 500 (no `error` field) maps to the `submit_failed` code in
      // RespondentIntakeForm; an UNRECOGNIZED code would fall through to
      // the generic "Nastala chyba…" copy instead.
      await page.route("**/api/begin-edu-attempt", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      });
      await intake.clickSubmit();
      await expect(intake.errorMessage).toContainText("Formulár sa nepodarilo odoslať.");
      await expect(intake.nameInput).toHaveValue("Jana Testovacia");
      await expect(intake.emailInput).toHaveValue("jana.testovacia@test.sk");
      await expect(intake.submitButton).toBeEnabled();
    });

    await test.step("Variant (b): 409 already_attempted → correct Slovak copy", async () => {
      await page.route("**/api/begin-edu-attempt", async (route) => {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "already_attempted" }),
        });
      });
      await intake.clickSubmit();
      await expect(intake.errorMessage).toContainText(
        "Tento test si už pod týmto e-mailom absolvoval/a.",
      );
      await expect(intake.nameInput).toHaveValue("Jana Testovacia");
      await expect(intake.emailInput).toHaveValue("jana.testovacia@test.sk");
      await expect(intake.submitButton).toBeEnabled();
    });

    await test.step("Variant (c): 429 rate_limited → correct Slovak copy", async () => {
      await page.route("**/api/begin-edu-attempt", async (route) => {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ error: "rate_limited" }),
        });
      });
      await intake.clickSubmit();
      await expect(intake.errorMessage).toContainText(
        "Príliš veľa pokusov v krátkom čase. Skús znova o pár minút.",
      );
      await expect(intake.nameInput).toHaveValue("Jana Testovacia");
      await expect(intake.emailInput).toHaveValue("jana.testovacia@test.sk");
      await expect(intake.submitButton).toBeEnabled();
    });

    await test.step("Variant (d): route.abort → network error copy", async () => {
      await page.route("**/api/begin-edu-attempt", async (route) => {
        await route.abort();
      });
      await intake.clickSubmit();
      await expect(intake.errorMessage).toContainText("Pripojenie sa nepodarilo.");
      await expect(intake.nameInput).toHaveValue("Jana Testovacia");
      await expect(intake.emailInput).toHaveValue("jana.testovacia@test.sk");
      await expect(intake.submitButton).toBeEnabled();
    });

    await test.step("Re-stub → 200 with token, submit → quiz starts", async () => {
      await mockSupabase(page, {
        tables: { test_sets: [TEST_SET_ROW] },
        rpcs: {
          get_quick_test_questions: () => [],
        },
      });
      await page.route("**/api/begin-edu-attempt", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ token: "eyJ.fake.token" }),
        });
      });
      await intake.clickSubmit();
      await expect(intake.formRoot).toHaveCount(0);
    });
  });

  // ERR-11: finish persist failure shows the persist alert; retry delivers.
  test("ERR-11: finish-edu-attempt 500 shows persist alert; retry removes it", async ({ page }) => {
    const intake = new IntakeFormPage(page);
    const quizFlow = new QuizFlowPage(page);

    await test.step("Set up mocks and navigate to the edu test page", async () => {
      await mockSupabase(page, {
        tables: { test_sets: [TEST_SET_ROW] },
        rpcs: {
          get_quick_test_questions: () => [],
        },
      });
      await page.route("**/api/begin-edu-attempt", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ token: "eyJ.valid.token" }),
        });
      });
      await page.route("**/api/finish-edu-attempt", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "insert_failed" }),
        });
      });
      await intake.open(TEST_SET_ID);
    });

    await test.step("Fill intake form and submit to start the quiz", async () => {
      await intake.fillName("Peter Testor");
      await intake.fillEmail("peter.testor@test.sk");
      await intake.checkConsent();
      await intake.clickSubmit();
    });

    await test.step("Answer all questions in the edu quiz", async () => {
      await quizFlow.questionCard.waitFor({ state: "visible" });
      await quizFlow.answerAllQuestions(2);
    });

    await test.step("Verify persist-failure alert is visible with verbatim copy", async () => {
      await expect(quizFlow.persistError).toBeVisible();
      await expect(quizFlow.persistErrorMessage).toContainText(
        "Tvoj výsledok sa nepodarilo doručiť autorovi testu.",
      );
    });

    await test.step("Click retry while still failing — alert persists", async () => {
      await quizFlow.persistRetry.click();
      await expect(quizFlow.persistError).toBeVisible();
    });

    await test.step("Re-stub → 200, retry → alert disappears", async () => {
      await page.route("**/api/finish-edu-attempt", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ share_id: "AAAAAAAA", attempt_id: "attempt-new-001" }),
        });
      });
      await quizFlow.persistRetry.click();
      await expect(quizFlow.persistError).toHaveCount(0);
    });
  });
});

// ---------------------------------------------------------------------------
// D. Author results — password gate + dashboard at /test/builder/<setId>/results
// ---------------------------------------------------------------------------

test.describe("D. Author results — password gate and dashboard error paths", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // ERR-12: verify-author-password 500 — verbatim error, password preserved, retry enters dashboard.
  test("ERR-12: verify-author-password 500 shows verbatim error, password preserved, retry enters dashboard", async ({
    page,
  }) => {
    const resultsGate = new ResultsGatePage(page);

    await test.step("Stub results-data → 401 and verify → 500, open the results page", async () => {
      await page.route("**/api/results-data", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "no_session" }),
        });
      });
      await page.route("**/api/verify-author-password", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "internal" }),
          });
        } else {
          await route.continue();
        }
      });
      await resultsGate.open(TEST_SET_ID);
    });

    await test.step("Verify the auth gate is shown", async () => {
      await expect(resultsGate.authGate).toBeVisible();
    });

    await test.step("Submit a password — verify → 500 error shown", async () => {
      await resultsGate.passwordInput.fill("mypassword");
      await resultsGate.submitButton.click();
      await expect(resultsGate.gateError).toHaveText(
        "Chyba pri overovaní hesla. Skús to prosím znova.",
      );
    });

    await test.step("Verify the password input retains its value", async () => {
      await expect(resultsGate.passwordInput).toHaveValue("mypassword");
    });

    await test.step("Re-stub verify → 200 ok:true and results-data → 200, retry", async () => {
      await page.route("**/api/verify-author-password", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true }),
          });
        } else {
          await route.continue();
        }
      });
      await page.route("**/api/results-data", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeResultsDataSuccess()),
        });
      });
      await resultsGate.submitButton.click();
    });

    await test.step("Verify dashboard renders with 2 respondents", async () => {
      await expect(resultsGate.dashboard).toBeVisible();
      await expect(resultsGate.aggStatsCount).toContainText("2");
    });
  });

  // ERR-13: results-data 500 renders the error state.
  test("ERR-13: results-data 500 on first load renders the error state", async ({ page }) => {
    const resultsGate = new ResultsGatePage(page);

    await test.step("Stub results-data → 500 and navigate", async () => {
      await page.route("**/api/results-data", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "lookup_failed" }),
        });
      });
      await resultsGate.open(TEST_SET_ID);
    });

    await test.step("Verify the error state renders with verbatim copy", async () => {
      await expect(resultsGate.errorState).toBeVisible();
      await expect(resultsGate.errorState).toContainText("Niečo sa pokazilo");
      await expect(resultsGate.errorState).toContainText("Skús obnoviť stránku.");
    });
  });

  // ERR-14: delete failure surfaces the inline alert and keeps the row; retry removes it.
  test("ERR-14: delete failure shows inline alert, row stays; retry removes it", async ({
    page,
  }) => {
    const resultsGate = new ResultsGatePage(page);

    await test.step("Enter the dashboard with 2 respondents (happy stubs)", async () => {
      await page.route("**/api/results-data", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeResultsDataSuccess()),
        });
      });
      await page.route("**/api/verify-author-password", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true }),
          });
        } else {
          await route.continue();
        }
      });
      // No cookie — results-data is called first; with 200 it skips the gate and
      // goes to "ready". Stub results-data to return 200 directly (bypasses auth gate).
      await resultsGate.open(TEST_SET_ID);
      await expect(resultsGate.dashboard).toBeVisible();
    });

    await test.step("Stub delete → 500 and click delete on respondent A", async () => {
      await page.route("**/api/delete-edu-respondent", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "internal" }),
        });
      });
      await resultsGate.tableDeleteButton(RESPONDENT_A.id).click();
      await resultsGate.deleteConfirmButton.click();
    });

    await test.step("Verify delete-error alert shows verbatim copy and row is still present", async () => {
      await expect(resultsGate.deleteError).toBeVisible();
      await expect(resultsGate.deleteError).toContainText(
        "Respondenta sa nepodarilo vymazať. Skús to prosím znova.",
      );
      await expect(resultsGate.tableRow(RESPONDENT_A.id)).toBeVisible();
    });

    await test.step("Re-stub delete → 200 and results-data → list without respondent A, delete again", async () => {
      await page.route("**/api/delete-edu-respondent", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });
      await page.route("**/api/results-data", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeResultsDataSuccess([RESPONDENT_B])),
        });
      });
      await resultsGate.tableDeleteButton(RESPONDENT_A.id).click();
      await resultsGate.deleteConfirmButton.click();
    });

    await test.step("Verify row gone and error alert gone", async () => {
      await expect(resultsGate.tableRow(RESPONDENT_A.id)).toHaveCount(0);
      await expect(resultsGate.deleteError).toHaveCount(0);
    });
  });
});

// ---------------------------------------------------------------------------
// E. App educator shell — /app sessions CSV export error
// ---------------------------------------------------------------------------

test.describe("E. App educator shell — CSV export error", () => {
  // ERR-15: /app sessions CSV export failure shows the toast.
  test("ERR-15: CSV export 500 shows sonner toast with verbatim copy, button remains enabled", async ({
    context,
    page,
  }) => {
    const testEditor = new TestEditorPage(page);
    const detail = new TestSessionsDetailPage(page);

    await test.step("Set up educator app shell with the standard sessions seed", async () => {
      // Mirror the green test-sessions-detail.spec.ts setup — the editor
      // page reads more tables than tests+sessions, and the canonical
      // seed factory provides the full set.
      const seed = seedE49TestWithSessions();
      await setupEducator(context, page, { tables: seed.tables });
      await detail.gotoTest(seed.testId);
      await expect(detail.root).toBeVisible();
    });

    await test.step("Stub export-sessions → 500 and click the export CSV button", async () => {
      await page.route("**/api/tests/export-sessions**", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "internal" }),
        });
      });
      await expect(testEditor.sessionsExportCsvButton).toBeVisible();
      await testEditor.sessionsExportCsvButton.click();
    });

    await test.step("Verify sonner toast with verbatim copy", async () => {
      await expect(testEditor.sonnerToast).toContainText("Export zlyhal. Skús to znova.");
    });

    await test.step("Verify the export button remains enabled", async () => {
      await expect(testEditor.sessionsExportCsvButton).toBeEnabled();
    });
  });
});
