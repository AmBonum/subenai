// spec: specs/quiz/share-result.md

import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { stubAttemptsByShareId, makeAttemptRow } from "../../mocks/supabase/attempts";
import type { AnswerRecordPersisted } from "../../../src/lib/quiz/bank/schema";

test.describe("Share result page (/r/$shareId)", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-01: Valid share renders score card, personality card, and breakdown
  test("TC-01: Valid share renders score card, personality card, and breakdown", async ({
    page,
    shareResult,
  }) => {
    await test.step("Stub Supabase to return a valid attempts row", async () => {
      await stubAttemptsByShareId(page, {
        row: makeAttemptRow({ share_id: "TESTAAAA", final_score: 75, percentile: 70 }),
      });
    });

    await test.step("Navigate to /r/TESTAAAA", async () => {
      await shareResult.open("TESTAAAA");
    });

    await test.step("Verify the score card shows 75", async () => {
      await expect(shareResult.scoreValue).toHaveText("75");
    });

    await test.step("Verify the percentile shows 70", async () => {
      await expect(shareResult.percentileValue).toContainText("70");
    });

    await test.step("Verify the personality card is visible", async () => {
      await expect(shareResult.personalityCard).toBeVisible();
    });

    await test.step('Verify the breakdown card is visible with heading "Rozloženie"', async () => {
      await expect(shareResult.breakdownCard).toBeVisible();
      await expect(shareResult.breakdownCard).toContainText("Rozloženie");
    });

    await test.step('Verify the CTA link "Otestuj sa aj ty" is visible', async () => {
      await expect(shareResult.ctaTestLink).toBeVisible();
      await expect(shareResult.ctaTestLink).toHaveText("Otestuj sa aj ty");
    });
  });

  // TC-02: Unknown shareId renders the not-found state
  test("TC-02: Unknown shareId renders the not-found state", async ({ page, shareResult }) => {
    await test.step("Stub Supabase to return no row (not found)", async () => {
      await stubAttemptsByShareId(page, { row: null });
    });

    await test.step("Navigate to /r/NOTFOUND", async () => {
      await shareResult.open("NOTFOUND");
    });

    await test.step("Verify the not-found container is visible", async () => {
      await expect(shareResult.notFoundContainer).toBeVisible();
    });

    await test.step('Verify the not-found heading "Výsledok neexistuje" is visible', async () => {
      await expect(shareResult.notFoundContainer).toContainText("Výsledok neexistuje");
    });

    await test.step('Verify the not-found body "Link je neplatný alebo bol zmazaný." is visible', async () => {
      await expect(shareResult.notFoundContainer).toContainText(
        "Link je neplatný alebo bol zmazaný.",
      );
    });

    await test.step('Verify the "Otestuj sa" CTA link is visible', async () => {
      await expect(shareResult.notFoundCta).toBeVisible();
      await expect(shareResult.notFoundCta).toHaveText("Otestuj sa");
    });

    await test.step("Verify the success page root is not rendered", async () => {
      await expect(shareResult.pageRoot).not.toBeAttached();
    });
  });

  // TC-03: Delete flow — confirm and complete transitions to deleted state
  test("TC-03: Delete flow — confirm and complete transitions to deleted state", async ({
    page,
    shareResult,
  }) => {
    await test.step("Stub Supabase GET (valid row) and DELETE (204 success)", async () => {
      await stubAttemptsByShareId(page, {
        row: makeAttemptRow({ share_id: "DLTAAAAA" }),
        deleteStatus: 204,
      });
    });

    await test.step("Navigate to /r/DLTAAAAA and wait for the page to render", async () => {
      await shareResult.open("DLTAAAAA");
      await expect(shareResult.pageRoot).toBeVisible();
    });

    await test.step('Click the "Vymazať tento výsledok" button', async () => {
      await shareResult.initiateDelete();
    });

    await test.step("Verify the confirm and cancel buttons are visible", async () => {
      await expect(shareResult.deleteConfirmButton).toBeVisible();
      await expect(shareResult.deleteConfirmButton).toHaveText("Áno, definitívne vymazať");
      await expect(shareResult.deleteCancelButton).toBeVisible();
    });

    await test.step('Click "Áno, definitívne vymazať" to complete the deletion', async () => {
      await shareResult.confirmDelete();
    });

    await test.step('Verify the "Výsledok bol vymazaný." confirmation message is visible', async () => {
      await expect(shareResult.deleteDoneMessage).toBeVisible();
      await expect(shareResult.deleteDoneMessage).toContainText("Výsledok bol vymazaný.");
    });
  });

  // TC-04: Review section — known-bundle questions render cards;
  // UUID-only questions render the missing-question placeholder
  test("TC-04: Review section renders bundle questions and missing-question placeholder for UUID-only IDs", async ({
    page,
    shareResult,
  }) => {
    const answers: AnswerRecordPersisted[] = [
      {
        questionId: "p-sms-posta-1",
        optionId: "b",
        correct: true,
        severity: null,
        responseMs: 3000,
        category: "phishing",
        difficulty: "easy",
      },
      {
        questionId: "00000000-0000-0000-0000-000000000001",
        optionId: "a",
        correct: false,
        severity: "critical",
        responseMs: 4000,
        category: "phishing",
        difficulty: "easy",
      },
    ];

    await test.step("Stub Supabase to return a row with two answers (one bundle, one UUID)", async () => {
      await stubAttemptsByShareId(page, {
        row: makeAttemptRow({ share_id: "REVAAAAA", answers }),
      });
    });

    await test.step("Navigate to /r/REVAAAAA and wait for the page to render", async () => {
      await shareResult.open("REVAAAAA");
      await expect(shareResult.pageRoot).toBeVisible();
    });

    await test.step("Verify the review toggle is visible and collapsed", async () => {
      await expect(shareResult.reviewToggle).toBeVisible();
      await expect(shareResult.reviewToggle).toHaveAttribute("aria-expanded", "false");
    });

    await test.step("Click the review toggle to expand the answer review section", async () => {
      await shareResult.openReview();
    });

    await test.step("Verify the review region is now expanded", async () => {
      await expect(shareResult.reviewToggle).toHaveAttribute("aria-expanded", "true");
      await expect(shareResult.reviewRegion).not.toHaveAttribute("hidden");
    });

    await test.step("Verify the missing-question placeholder renders for the UUID question", async () => {
      await expect(shareResult.reviewRegion).toContainText(
        "Otázka už nie je dostupná — bola odstránená z banky po tom, čo si test dokončil/a.",
      );
    });

    await test.step("Verify a real answer card renders for the known-bundle question", async () => {
      await expect(shareResult.reviewRegion).toContainText("Otázka 1 / 2");
    });
  });
});
