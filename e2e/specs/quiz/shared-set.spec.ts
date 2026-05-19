import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { mockSupabase } from "../../mocks/supabase/index";
import { SharedSetPage } from "../../poms/quiz/SharedSetPage";
import { QuizFlowPage } from "../../poms/quiz/QuizFlowPage";

const SET_ID = "aaaaaaaa-1111-2222-3333-000000000001";

const SEEDED_SET = {
  id: SET_ID,
  creator_label: "E-shop onboarding Q1",
  question_ids: ["p-sms-posta-1", "p-sms-dpd-1", "p-sms-tatra-1", "p-sms-slsp-1", "p-sms-csob-1"],
  passing_threshold: 70,
  max_questions: 5,
  collects_responses: false,
  source_pack_slugs: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

async function seedSet(page: import("@playwright/test").Page) {
  await mockSupabase(page, { tables: { test_sets: [SEEDED_SET] } });
}

async function seedEmpty(page: import("@playwright/test").Page) {
  await mockSupabase(page, { tables: { test_sets: [] } });
}

test.describe("Shared-set routes — /test/zostava/$id", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-01: Landing page renders for a seeded set
  test("TC-01: landing page renders set heading, question count, and start CTA", async ({
    page,
  }) => {
    const sharedSet = new SharedSetPage(page);

    await test.step("Seed the test_sets table with one row and open the landing page", async () => {
      await seedSet(page);
      await sharedSet.open(SET_ID);
    });

    await test.step("Verify the page container is visible", async () => {
      await expect(sharedSet.page_).toBeVisible();
    });

    await test.step("Verify the heading reads 'E-shop onboarding Q1'", async () => {
      await expect(sharedSet.heading).toHaveText("E-shop onboarding Q1");
    });

    await test.step("Verify the question count contains '📋 5 otázok'", async () => {
      await expect(sharedSet.questionCount).toContainText("📋 5 otázok");
    });

    await test.step("Verify the 'Spustiť test →' CTA is visible and enabled", async () => {
      await expect(sharedSet.startButton).toBeVisible();
      await expect(sharedSet.startButton).toBeEnabled();
    });
  });

  // TC-02: Not-found state when set id does not exist
  test("TC-02: not-found state renders when the set id has no matching row", async ({ page }) => {
    const sharedSet = new SharedSetPage(page);

    await test.step("Seed test_sets with zero rows and navigate to a non-existent id", async () => {
      await seedEmpty(page);
      await sharedSet.open("does-not-exist");
    });

    await test.step("Verify the not-found heading reads 'Test nenájdený'", async () => {
      await expect(sharedSet.notFoundHeading).toHaveText("Test nenájdený");
    });

    await test.step("Verify the not-found body reads the expected message", async () => {
      await expect(sharedSet.notFoundBody).toHaveText(
        "Tento odkaz neukazuje na žiadnu zostavu. Mohol byť odstránený alebo URL je preklepnuté.",
      );
    });

    await test.step("Verify the start CTA is not rendered", async () => {
      await expect(sharedSet.startButton).toHaveCount(0);
    });
  });

  // TC-03: Clicking "Spustiť test →" shows the first question
  test("TC-03: clicking start CTA mounts TestFlow and shows the first question", async ({
    page,
  }) => {
    const sharedSet = new SharedSetPage(page);
    const flow = new QuizFlowPage(page);

    await test.step("Seed the set and open the landing page", async () => {
      await seedSet(page);
      await sharedSet.open(SET_ID);
    });

    await test.step("Verify start button is visible before click", async () => {
      await expect(sharedSet.startButton).toBeVisible();
    });

    await test.step("Click the 'Spustiť test →' button", async () => {
      await sharedSet.clickStart();
    });

    await test.step("Verify the question card becomes visible", async () => {
      await expect(flow.questionCard).toBeVisible();
    });

    await test.step("Verify the progress indicator reads 'Otázka 1 / 5'", async () => {
      await expect(flow.progressIndicator).toHaveText("Otázka 1 / 5");
    });
  });

  // TC-04: Completing all questions shows the in-page results view
  test("TC-04: completing all questions renders the in-page results score", async ({ page }) => {
    const sharedSet = new SharedSetPage(page);
    const flow = new QuizFlowPage(page);

    await test.step("Seed the set and open the landing page", async () => {
      await seedSet(page);
      await sharedSet.open(SET_ID);
    });

    await test.step("Click the start CTA and wait for the first question card", async () => {
      await sharedSet.clickStart();
      await flow.questionCard.waitFor({ state: "visible" });
    });

    await test.step("Answer all 5 questions by picking option 'a' each time", async () => {
      for (let i = 0; i < 5; i++) {
        await flow.questionCard.waitFor({ state: "visible", timeout: 10000 });
        await flow.clickOption("a");
        if (i < 4) {
          const nextLabel = `Otázka ${i + 2} / 5`;
          await flow.page
            .getByTestId("quiz-flow-progress")
            .filter({ hasText: nextLabel })
            .waitFor({ state: "visible", timeout: 10000 });
        }
      }
    });

    await test.step("Verify the results score value appears in-page", async () => {
      await expect(flow.scoreValue).toBeVisible({ timeout: 10000 });
    });

    await test.step("Verify the URL has not changed away from the shared-set route", async () => {
      await expect(page).toHaveURL(new RegExp(`/test/zostava/${SET_ID}`));
    });
  });
});

test.describe("Shared-set routes — /test/zostava/$id/vysledky", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-05: /vysledky shows password gate when /api/results-data returns 401.
  // Re-enabled 2026-05-19 after the parent Outlet fix landed (parent
  // `test.zostava.$id.lazy.tsx` now renders <Outlet/>, page content moved
  // to `test.zostava.$id.index.lazy.tsx` sibling).
  test("TC-05: /vysledky shows auth-gate heading and password input when unauthenticated", async ({
    page,
  }) => {
    const sharedSet = new SharedSetPage(page);

    await test.step("Mock /api/results-data to return 401 and open the vysledky route", async () => {
      await page.route("**/api/results-data*", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "unauthorized" }),
        });
      });
      await sharedSet.openVysledky(SET_ID);
    });

    await test.step("Verify the auth-gate container is visible", async () => {
      await expect(sharedSet.vysledkyAuthGate).toBeVisible({ timeout: 8000 });
    });

    await test.step("Verify the gate heading reads 'Výsledky edu testu'", async () => {
      await expect(sharedSet.vysledkyGateHeading).toHaveText("Výsledky edu testu");
    });

    await test.step("Verify the password input is visible", async () => {
      await expect(sharedSet.vysledkyGatePasswordInput).toBeVisible();
    });

    await test.step("Verify the results dashboard is not rendered", async () => {
      await expect(sharedSet.vysledkyDashboard).toHaveCount(0);
    });
  });
});
