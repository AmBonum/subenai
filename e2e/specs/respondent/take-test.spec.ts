import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { mockSupabase, type MockSupabaseErrorConfig } from "../../mocks/supabase";
import { TakeTestPage } from "../../poms/respondent/TakeTestPage";

// Test plan: specs/respondent/take-test.md

const SHARE_ID = "shareid12345";
const SESSION_ID = "11111111-1111-1111-1111-111111111111";
const SESSION_TOKEN = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const Q1_OPTIONS = ["Možnosť A", "Možnosť B", "Možnosť C"];

// Raw RPC payload shape of get_respondent_test_by_share_id — questions
// carry {id,type,prompt,options,correct,position}; the client normalizes
// options/correct (src/lib/respondent/queries.ts).
function resolvedPayload(intakeFields: unknown[] = []) {
  return {
    test: {
      id: "tst_e2e_take_0001",
      title: "Vzorový E2E test",
      description: "Krátky test pre overenie respondentského behu.",
      intake_fields: intakeFields,
      gdpr_purpose: "research",
      allow_behavioral_tracking: false,
      status: "published",
      question_order_mode: "fixed",
    },
    questions: [
      {
        id: "qp_0001",
        type: "single",
        prompt: "Ktorá možnosť je správna?",
        options: Q1_OPTIONS,
        correct: [0],
        position: 0,
      },
      {
        id: "qp_0002",
        type: "open",
        prompt: "Napíš vlastnú odpoveď.",
        options: null,
        correct: null,
        position: 1,
      },
    ],
  };
}

interface RpcLog {
  resolve: unknown[];
  start: unknown[];
  submit: unknown[];
  finalize: unknown[];
}

/**
 * Wire the four respondent RPCs with recording resolvers + stub the
 * password preflight (a CF Pages Function the Vite dev server doesn't
 * serve). Returns the per-RPC call log for count/payload assertions.
 */
async function setupTakeTest(
  page: Page,
  opts: {
    resolveResult?: unknown;
    errors?: Record<string, MockSupabaseErrorConfig>;
  } = {},
): Promise<RpcLog> {
  const log: RpcLog = { resolve: [], start: [], submit: [], finalize: [] };
  await page.route("**/api/tests/check-password**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ has_password: false }),
    });
  });
  await mockSupabase(page, {
    rpcs: {
      get_respondent_test_by_share_id: (body: unknown) => {
        log.resolve.push(body);
        return opts.resolveResult ?? null;
      },
      start_respondent_session: (body: unknown) => {
        log.start.push(body);
        return { session_id: SESSION_ID, session_token: SESSION_TOKEN };
      },
      submit_respondent_answer: (body: unknown) => {
        log.submit.push(body);
        return null;
      },
      finalize_respondent_session: (body: unknown) => {
        log.finalize.push(body);
        return null;
      },
    },
    errors: opts.errors,
  });
  return log;
}

test.describe("/t/:shareId — public respondent flow", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-01: Full take — resolve, intake consent, two answers, finalize once
  test("TC-01: happy path answers both questions and finalizes exactly once", async ({ page }) => {
    const log = await setupTakeTest(page, { resolveResult: resolvedPayload() });
    const takeTest = new TakeTestPage(page);

    await test.step("Open /t/<shareId> and verify title + description render", async () => {
      await takeTest.open(SHARE_ID);
      await expect(takeTest.testTitle).toHaveText("Vzorový E2E test");
      await expect(takeTest.testDescription).toHaveText(
        "Krátky test pre overenie respondentského behu.",
      );
    });

    await test.step("Grant consent and start the session", async () => {
      await takeTest.intakeConsentCheckbox.click();
      await takeTest.intakeSubmitButton.click();
      await expect(takeTest.questionPrompt(0)).toHaveText("Ktorá možnosť je správna?");
    });

    await test.step("Answer Q1 (single choice) and advance", async () => {
      await takeTest.answerOption(0, 1).click();
      await takeTest.nextButton.click();
      await expect(takeTest.questionPrompt(1)).toHaveText("Napíš vlastnú odpoveď.");
    });

    await test.step("Answer Q2 (free text) and finish", async () => {
      await takeTest.answerInput(1).fill("Moja odpoveď");
      await takeTest.submitButton.click();
      await expect(takeTest.thankYou).toBeVisible();
      await expect(takeTest.thankYouTitle).toHaveText("Hotovo!");
    });

    await test.step("Thank-you exit offers the quick-test CTA, not a bare close", async () => {
      await expect(takeTest.thankYouQuickTestCta).toHaveText(
        "Otestuj si svoje scam radary — rýchly test zadarmo",
      );
      await expect(takeTest.thankYouQuickTestCta).toHaveAttribute("href", "/test");
      await expect(takeTest.thankYouCloseButton).toHaveText("Zatvoriť");
    });

    await test.step("Verify RPC call counts and payloads", async () => {
      expect(log.start).toHaveLength(1);
      expect(log.start[0]).toMatchObject({ p_share_id: SHARE_ID, p_consent_given: true });
      expect(log.submit).toHaveLength(2);
      expect(log.submit[0]).toMatchObject({ p_question_id: "qp_0001", p_value: "Možnosť B" });
      expect(log.submit[1]).toMatchObject({ p_question_id: "qp_0002", p_value: "Moja odpoveď" });
      expect(log.finalize).toHaveLength(1);
      expect(log.finalize[0]).toMatchObject({ p_session_id: SESSION_ID });
    });
  });

  // TC-02: Back-navigation keeps the answer; unchanged re-submit skips the RPC
  test("TC-02: back-navigation preserves the answer and dedupes submissions", async ({ page }) => {
    const log = await setupTakeTest(page, { resolveResult: resolvedPayload() });
    const takeTest = new TakeTestPage(page);

    await test.step("Start the session and answer Q1 with option B", async () => {
      await takeTest.open(SHARE_ID);
      await takeTest.intakeConsentCheckbox.click();
      await takeTest.intakeSubmitButton.click();
      await takeTest.answerOption(0, 1).click();
      await takeTest.nextButton.click();
      await expect(takeTest.questionPrompt(1)).toBeVisible();
    });

    await test.step("Go back — Q1 selection is still shown", async () => {
      await takeTest.prevButton.click();
      await expect(takeTest.answerOptionRadio(0, 1)).toBeChecked();
    });

    await test.step("Advance with the UNCHANGED answer — no duplicate submit", async () => {
      await takeTest.nextButton.click();
      await expect(takeTest.questionPrompt(1)).toBeVisible();
      expect(log.submit).toHaveLength(1);
    });

    await test.step("Go back and CHANGE the answer to option A — one more submit", async () => {
      await takeTest.prevButton.click();
      await takeTest.answerOption(0, 0).click();
      await takeTest.nextButton.click();
      await expect(takeTest.questionPrompt(1)).toBeVisible();
      expect(log.submit).toHaveLength(2);
      expect(log.submit[1]).toMatchObject({ p_question_id: "qp_0001", p_value: "Možnosť A" });
    });

    await test.step("Answer Q2 and finish — deduped score, finalize once", async () => {
      await takeTest.answerInput(1).fill("Hocičo");
      await takeTest.submitButton.click();
      await expect(takeTest.thankYou).toBeVisible();
      expect(log.submit).toHaveLength(3);
      expect(log.finalize).toHaveLength(1);
      // Deduped answers: Q1 correct ("Možnosť A"), Q2 not scored → 1/2 = 50.
      expect(log.finalize[0]).toMatchObject({ p_score: 50 });
    });
  });

  // TC-03: Unknown share id — RPC resolves null, not-found UI, no session RPCs
  test("TC-03: unknown share id renders the Slovak not-found card without session RPCs", async ({
    page,
  }) => {
    const log = await setupTakeTest(page, { resolveResult: null });
    const takeTest = new TakeTestPage(page);

    await test.step("Open /t/<unknown shareId>", async () => {
      await takeTest.open("unknown99999");
    });

    await test.step("Verify the not-found card with verbatim Slovak copy", async () => {
      await expect(takeTest.notFound).toBeVisible();
      await expect(takeTest.notFoundMessage).toHaveText(
        "Test nebol nájdený alebo už nie je dostupný.",
      );
      await expect(takeTest.notFoundHomeLink).toHaveText("Späť na úvod");
    });

    await test.step("Verify the resolve RPC fired and no session RPC fired", async () => {
      // React StrictMode (dev server) double-invokes the resolve effect,
      // so the count is >= 1 here; the prod build fires it once.
      expect(log.resolve.length).toBeGreaterThanOrEqual(1);
      expect(log.start).toHaveLength(0);
      expect(log.submit).toHaveLength(0);
      expect(log.finalize).toHaveLength(0);
    });
  });

  // TC-04: Malformed share id — client-side zod regex rejects before any RPC
  test("TC-04: malformed share id (UUID with dashes) never calls the resolve RPC", async ({
    page,
  }) => {
    const log = await setupTakeTest(page, { resolveResult: resolvedPayload() });
    const takeTest = new TakeTestPage(page);

    await test.step("Open /t/<uuid-with-dashes>", async () => {
      await takeTest.open("123e4567-e89b-12d3-a456-426614174000");
    });

    await test.step("Verify the not-found card renders", async () => {
      await expect(takeTest.notFound).toBeVisible();
      await expect(takeTest.notFoundMessage).toHaveText(
        "Test nebol nájdený alebo už nie je dostupný.",
      );
    });

    await test.step("Verify NO RPC was called (regex gate is client-side)", async () => {
      expect(log.resolve).toHaveLength(0);
      expect(log.start).toHaveLength(0);
    });
  });

  // TC-05: Resolve RPC 500 — route maps the failure to the not-found card
  test("TC-05: resolve RPC failure (500) renders not-found gracefully, no soft success", async ({
    page,
  }) => {
    const log = await setupTakeTest(page, {
      errors: {
        get_respondent_test_by_share_id: { status: 500, message: "internal error" },
      },
    });
    const takeTest = new TakeTestPage(page);

    await test.step("Open /t/<shareId> while the resolve RPC 500s", async () => {
      await takeTest.open(SHARE_ID);
    });

    await test.step("Verify the not-found card renders (actual error mapping)", async () => {
      // useResolveRespondentTest catches the thrown RPC error and maps it
      // to the not_found state — there is no dedicated error screen.
      await expect(takeTest.notFound).toBeVisible();
      await expect(takeTest.notFoundMessage).toHaveText(
        "Test nebol nájdený alebo už nie je dostupný.",
      );
    });

    await test.step("Verify no runner UI and no session RPCs (no soft success)", async () => {
      await expect(takeTest.root).toHaveCount(0);
      await expect(takeTest.thankYou).toHaveCount(0);
      expect(log.start).toHaveLength(0);
      expect(log.finalize).toHaveLength(0);
    });
  });

  // TC-06: Required intake field gates the quiz until filled
  test("TC-06: required intake field blocks start until filled", async ({ page }) => {
    const log = await setupTakeTest(page, {
      resolveResult: resolvedPayload([
        { id: "if_name", label: "Meno", type: "text", required: true, pii: true },
      ]),
    });
    const takeTest = new TakeTestPage(page);

    await test.step("Open the test and grant consent only", async () => {
      await takeTest.open(SHARE_ID);
      await expect(takeTest.intakeNameInput).toBeVisible();
      await takeTest.intakeConsentCheckbox.click();
    });

    await test.step("Submit without the required field — gated with Slovak error", async () => {
      await takeTest.intakeSubmitButton.click();
      await expect(takeTest.intakeError).toHaveText("Vyplň povinné polia: Meno");
      expect(log.start).toHaveLength(0);
    });

    await test.step("Fill the required field and submit — quiz starts", async () => {
      await takeTest.intakeNameInput.fill("Anna");
      await takeTest.intakeSubmitButton.click();
      await expect(takeTest.questionPrompt(0)).toBeVisible();
      expect(log.start).toHaveLength(1);
      expect(log.start[0]).toMatchObject({ p_intake: { if_name: "Anna" } });
    });
  });

  // TC-07: Mid-test reload resumes the same session from sessionStorage
  test("TC-07: mid-test reload resumes the same session without a second start RPC", async ({
    page,
  }) => {
    const log = await setupTakeTest(page, { resolveResult: resolvedPayload() });
    const takeTest = new TakeTestPage(page);

    await test.step("Start the session and answer Q1", async () => {
      await takeTest.open(SHARE_ID);
      await takeTest.intakeConsentCheckbox.click();
      await takeTest.intakeSubmitButton.click();
      await takeTest.answerOption(0, 1).click();
      await takeTest.nextButton.click();
      await expect(takeTest.questionPrompt(1)).toBeVisible();
      expect(log.start).toHaveLength(1);
    });

    await test.step("Reload the page — flow resumes on Q2, intake skipped", async () => {
      await page.reload();
      await expect(takeTest.questionPrompt(1)).toBeVisible();
      await expect(takeTest.intakeSubmitButton).toHaveCount(0);
    });

    await test.step("Finish Q2 — same session finalized, NO second start_respondent_session", async () => {
      await takeTest.answerInput(1).fill("Po reloade");
      await takeTest.submitButton.click();
      await expect(takeTest.thankYou).toBeVisible();
      expect(log.start).toHaveLength(1);
      expect(log.finalize).toHaveLength(1);
      expect(log.finalize[0]).toMatchObject({ p_session_id: SESSION_ID });
      // Q1 answer (submitted pre-reload) + Q2 (post-reload) — the upsert
      // on (session_id, question_id) makes any re-submit idempotent.
      expect(log.submit).toHaveLength(2);
    });
  });
});
