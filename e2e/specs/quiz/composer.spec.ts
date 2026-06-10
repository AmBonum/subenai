import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { stubTestSets } from "../../mocks/api/test-sets";

// Minimal re-implementation of encodeConfig for test setup only.
// The real encodeConfig lives in src/lib/quiz/composer, but that module
// transitively imports React components and the full question bank —
// neither can be required in Playwright's Node runtime. This helper
// reproduces the identical wire format (base64url JSON with keys q/t/m/l/s).
function encodeComposerConfig(opts: {
  questionIds: string[];
  passingThreshold: number;
  maxQuestions: number;
  creatorLabel?: string;
  sourcePackSlugs?: string[];
}): string {
  const json = JSON.stringify({
    q: opts.questionIds,
    t: opts.passingThreshold,
    m: opts.maxQuestions,
    l: opts.creatorLabel ?? null,
    s: opts.sourcePackSlugs ?? null,
  });
  const bytes = Buffer.from(json, "utf8");
  return bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Real question IDs from the bank (first 6 from the phishing section).
// These are stable — slugs are the contract.
const REAL_IDS_6 = [
  "p-sms-posta-1",
  "p-sms-dpd-1",
  "p-sms-tatra-1",
  "p-sms-slsp-1",
  "p-sms-csob-1",
  "p-sms-fedex-1",
];

test.describe("Custom test composer", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-01: Page renders with all three sections and disabled action buttons
  test("TC-01: page renders all three sections with action buttons disabled", async ({
    composer,
  }) => {
    await test.step("Open /test/builder", async () => {
      await composer.open();
    });

    await test.step("Verify the page heading is visible", async () => {
      await expect(composer.heading).toBeVisible();
      await expect(composer.heading).toHaveText("Zostav vlastný test pre tím");
    });

    await test.step("Verify step-1 pack chips section is visible", async () => {
      await expect(composer.packChipsSection).toBeVisible();
    });

    await test.step("Verify step-2 question picker section is visible", async () => {
      await expect(composer.questionPickerSection).toBeVisible();
    });

    await test.step("Verify step-3 settings section is visible", async () => {
      await expect(composer.settingsSection).toBeVisible();
    });

    await test.step("Verify 'Spustiť pre seba' is disabled with zero selection", async () => {
      await expect(composer.runSelfButton).toBeDisabled();
    });

    await test.step("Verify submit button is disabled with zero selection", async () => {
      await expect(composer.submitButton).toBeDisabled();
    });

    await test.step("Verify URL copy button is not present", async () => {
      await expect(composer.urlCopyButton).toHaveCount(0);
    });
  });

  // TC-02: Selecting ≤ 10 questions enables URL copy button; > 10 hides it
  test("TC-02: URL copy button appears for ≤ 10 selected questions and disappears for > 10", async ({
    composer,
  }) => {
    await test.step("Open /test/builder", async () => {
      await composer.open();
    });

    await test.step("Toggle the eshop pack chip (14 questions) — forces DB share path", async () => {
      await composer.togglePackChip("eshop");
    });

    await test.step("Verify URL copy button is not visible with 14 questions selected", async () => {
      await expect(composer.urlCopyButton).toHaveCount(0);
    });

    await test.step("Toggle the eshop pack chip off to deselect all questions", async () => {
      await composer.togglePackChip("eshop");
    });

    await test.step("Select 6 questions individually via checkboxes", async () => {
      for (const id of REAL_IDS_6) {
        await composer.questionCheckbox(id).click();
      }
    });

    await test.step("Verify 'Spustiť pre seba' is enabled", async () => {
      await expect(composer.runSelfButton).toBeEnabled();
    });

    await test.step("Verify submit button 'Zdieľať s tímom' is enabled", async () => {
      await expect(composer.submitButton).toBeEnabled();
    });

    await test.step("Verify URL copy button 'Skopírovať draft cez URL (bez DB)' is visible", async () => {
      await expect(composer.urlCopyButton).toBeVisible();
    });

    await test.step("Select 5 more questions to exceed the URL-share threshold (> 10)", async () => {
      // Deselect the current 6, then select 11 unique ones.
      // Easier: just toggle the eshop pack chip which adds 14 IDs total.
      for (const id of REAL_IDS_6) {
        await composer.questionCheckbox(id).click();
      }
      await composer.togglePackChip("eshop");
    });

    await test.step("Verify URL copy button is gone for > 10 questions", async () => {
      await expect(composer.urlCopyButton).toHaveCount(0);
    });
  });

  // TC-03: "Spustiť pre seba" starts an inline self-run
  test("TC-03: 'Spustiť pre seba' replaces the composer with the inline test flow", async ({
    page,
    composer,
  }) => {
    await test.step("Open /test/builder", async () => {
      await composer.open();
    });

    await test.step("Select 6 questions to meet the minimum and enable the button", async () => {
      for (const id of REAL_IDS_6) {
        await composer.questionCheckbox(id).click();
      }
    });

    await test.step("Click 'Spustiť pre seba'", async () => {
      await composer.clickRunSelf();
    });

    await test.step("Verify the composer heading is gone (TestFlow has replaced it)", async () => {
      await expect(composer.heading).toHaveCount(0);
    });

    await test.step("Verify the URL stays at /test/builder (no navigation)", async () => {
      await expect(page).toHaveURL(/\/test\/zostav/);
    });
  });

  // TC-04: URL share — clicking the copy button shows the share toast
  test("TC-04: URL copy button shows the share toast after click", async ({ page, composer }) => {
    await test.step("Open /test/builder", async () => {
      await composer.open();
    });

    await test.step("Grant clipboard permission and grant clipboard-write", async () => {
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    });

    await test.step("Select 6 questions so the URL copy button is visible", async () => {
      for (const id of REAL_IDS_6) {
        await composer.questionCheckbox(id).click();
      }
    });

    await test.step("Click 'Skopírovať draft cez URL (bez DB)'", async () => {
      await composer.clickUrlCopy();
    });

    await test.step("Verify share toast 'Odkaz s draftom skopírovaný' appears", async () => {
      await expect(composer.shareToast).toBeVisible();
      await expect(composer.shareToast).toContainText("Odkaz s draftom skopírovaný");
    });

    await test.step("Verify share toast disappears after ~3 seconds", async () => {
      await expect(composer.shareToast).toBeHidden({ timeout: 5000 });
    });
  });

  // TC-05: DB share — submit POSTs to /api/test-sets and navigates to /test/builder/$id
  test("TC-05: submitting with > 10 questions POSTs to /api/test-sets and navigates to the set route", async ({
    page,
    composer,
  }) => {
    await test.step("Stub POST /api/test-sets to return { id: 'test-set-e2e' }", async () => {
      await stubTestSets(page, { status: 201, body: { id: "test-set-e2e" } });
    });

    await test.step("Open /test/builder", async () => {
      await composer.open();
    });

    await test.step("Toggle the eshop pack chip to select 14 questions (forces DB share)", async () => {
      await composer.togglePackChip("eshop");
    });

    await test.step("Verify submit button is enabled", async () => {
      await expect(composer.submitButton).toBeEnabled();
    });

    await test.step("Click 'Zdieľať s tímom'", async () => {
      await composer.clickSubmit();
    });

    await test.step("Verify the page navigates to /test/builder/test-set-e2e", async () => {
      await expect(page).toHaveURL(/\/test\/zostava\/test-set-e2e/);
    });
  });

  // TC-06: Stale-pack notice from ?config= drift — amber notice renders and can be dismissed
  test("TC-06: stale drift notice appears for renamed question IDs in ?config= and can be dismissed", async ({
    composer,
  }) => {
    const encoded = encodeComposerConfig({
      questionIds: [...REAL_IDS_6.slice(0, 5), "q-vanished-e2e"],
      passingThreshold: 70,
      maxQuestions: 6,
    });

    await test.step("Open /test/builder?config=<encoded-with-one-renamed-id>", async () => {
      await composer.open(`?config=${encoded}`);
    });

    await test.step("Verify the amber stale notice is visible", async () => {
      await expect(composer.staleNotice).toBeVisible();
    });

    await test.step("Verify notice text mentions unloaded questions from the URL", async () => {
      await expect(composer.staleNotice).toContainText("Z odkazu sa nepodarilo načítať");
    });

    await test.step("Click the dismiss button (aria-label 'Zatvoriť upozornenie')", async () => {
      await composer.dismissStaleNotice();
    });

    await test.step("Verify the stale notice is gone", async () => {
      await expect(composer.staleNotice).toHaveCount(0);
    });
  });
});
