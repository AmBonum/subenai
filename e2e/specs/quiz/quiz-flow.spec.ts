import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { mockSupabase } from "../../mocks/supabase";
import { FIXTURE_QUICK_TEST_QUESTIONS } from "../../mocks/data/quickTestQuestions";

test.describe("Quiz flow /test", () => {
  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    await mockSupabase(page, {
      rpcs: {
        get_quick_test_questions: FIXTURE_QUICK_TEST_QUESTIONS,
      },
      tables: {
        attempts: [],
      },
    });
  });

  // TC-01: `/test` page renders the ready card
  test("TC-01: /test page renders the ready card", async ({ quizFlow }) => {
    await test.step("Navigate to /test", async () => {
      await quizFlow.open();
    });

    await test.step("Verify the ready card is visible", async () => {
      await expect(quizFlow.readyCard).toBeVisible();
    });

    await test.step("Verify the heading 'Pripravený?' is visible inside the ready card", async () => {
      await expect(quizFlow.readyCard).toContainText("Pripravený?");
    });

    await test.step("Verify the body text 'Odpovedaj rýchlo. Čas beží.' is visible", async () => {
      await expect(quizFlow.readyCard).toContainText("Odpovedaj rýchlo. Čas beží.");
    });
  });

  // TC-02: First question is shown after the intro delay
  test("TC-02: First question is shown after the intro delay", async ({ quizFlow }) => {
    await test.step("Navigate to /test and wait for the playing phase", async () => {
      await quizFlow.open();
      await quizFlow.waitForPlayingPhase();
    });

    await test.step("Verify the question card is visible", async () => {
      await expect(quizFlow.questionCard).toBeVisible();
    });

    await test.step("Verify the progress indicator reads 'Otázka 1 / 10'", async () => {
      await expect(quizFlow.progressIndicator).toHaveText("Otázka 1 / 10");
    });

    await test.step("Verify the countdown timer is visible", async () => {
      await expect(quizFlow.timer).toBeVisible();
    });

    await test.step("Verify the question prompt is visible", async () => {
      await expect(quizFlow.prompt).toBeVisible();
    });

    await test.step("Verify all three answer option buttons are present", async () => {
      await expect(quizFlow.option("a")).toBeVisible();
      await expect(quizFlow.option("b")).toBeVisible();
      await expect(quizFlow.option("c")).toBeVisible();
    });
  });

  // TC-03: Answering all 10 questions advances to the results view
  test("TC-03: Answering all 10 questions advances to the results view", async ({ quizFlow }) => {
    test.setTimeout(60_000);
    await test.step("Navigate to /test and wait for the playing phase", async () => {
      await quizFlow.open();
      await quizFlow.waitForPlayingPhase();
    });

    await test.step("Answer all 10 questions by selecting option b on each", async () => {
      await quizFlow.answerAllQuestions(10);
    });

    await test.step("Wait for the results view to appear", async () => {
      await quizFlow.waitForResultsPhase();
    });

    await test.step("Verify the animated score value is visible", async () => {
      await expect(quizFlow.scoreValue).toBeVisible();
    });

    await test.step("Verify the breakdown section is visible", async () => {
      await expect(quizFlow.breakdown).toBeVisible();
    });
  });

  // TC-04: Results view shows share section after the attempts INSERT resolves
  test("TC-04: Results view shows share section after the attempts INSERT resolves", async ({
    quizFlow,
  }) => {
    test.setTimeout(60_000);
    await test.step("Navigate to /test, wait for playing phase, and answer all 10 questions", async () => {
      await quizFlow.open();
      await quizFlow.waitForPlayingPhase();
      await quizFlow.answerAllQuestions(10);
      await quizFlow.waitForResultsPhase();
    });

    await test.step("Verify the share section is visible", async () => {
      await expect(quizFlow.shareSection).toBeVisible();
    });

    await test.step("Verify the share URL input contains a /r/ link", async () => {
      await expect(quizFlow.shareUrlInput).toBeVisible();
      await expect(quizFlow.shareUrlInput).toHaveValue(/\/r\/[A-Z0-9]{8}/);
    });
  });

  // TC-05: Restart button returns to question 1
  test("TC-05: Restart button returns to question 1", async ({ quizFlow }) => {
    test.setTimeout(60_000);
    // TestFlow.restart() force-refetches get_quick_test_questions (the
    // RPC randomizes server-side via ORDER BY random(), so a refetch is
    // what delivers the promised fresh batch) and seeds questions from
    // the refetch result imperatively. This TC is the regression
    // sentinel against the user getting stuck on the intro card after
    // restart (see TestFlow.tsx restart() for the inline note).
    await test.step("Navigate to /test, wait for playing phase, and answer all 10 questions", async () => {
      await quizFlow.open();
      await quizFlow.waitForPlayingPhase();
      await quizFlow.answerAllQuestions(10);
      await quizFlow.waitForResultsPhase();
    });

    await test.step("Click the restart button", async () => {
      await quizFlow.restartButton.click();
    });

    await test.step("Verify the question card reappears", async () => {
      await expect(quizFlow.questionCard).toBeVisible();
    });

    await test.step("Verify the progress indicator reads 'Otázka 1 / 10'", async () => {
      await expect(quizFlow.progressIndicator).toHaveText("Otázka 1 / 10");
    });
  });
});
