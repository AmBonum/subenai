// spec: specs/quiz/tests-directory.md

import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { platformPacksAvailable, PACKS_SKIP_MESSAGE } from "../../fixtures/platform-packs";

test.describe("Tests directory — catalog + pack landing", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  // TC-01: Catalog page renders with all pack cards visible
  test("TC-01: Catalog page renders with all pack cards visible", async ({
    request,
    testsDirectory,
  }) => {
    test.skip(!(await platformPacksAvailable(request)), PACKS_SKIP_MESSAGE);
    await test.step("Open the /tests catalog page", async () => {
      await testsDirectory.index.open();
    });

    await test.step("Verify the page heading and intro paragraph are visible", async () => {
      await expect(testsDirectory.index.heading).toBeVisible();
      await expect(testsDirectory.index.heading).toHaveText(
        "Otestuj svoju branžu. Bez registrácie.",
      );
      await expect(testsDirectory.index.intro).toBeVisible();
    });

    await test.step("Verify the catalog grid contains at least 9 pack cards", async () => {
      await expect(testsDirectory.index.grid).toBeVisible();
      expect(await testsDirectory.index.packCards().count()).toBeGreaterThanOrEqual(9);
    });
  });

  // TC-02: Each card displays title, question-count meta and is a link to /tests/$slug
  test("TC-02: Each card displays title, question-count meta and is a link to /tests/$slug", async ({
    request,
    testsDirectory,
  }) => {
    test.skip(!(await platformPacksAvailable(request)), PACKS_SKIP_MESSAGE);
    await test.step("Open the /tests catalog page", async () => {
      await testsDirectory.index.open();
    });

    await test.step("Verify the eshop card title is visible and correct", async () => {
      await expect(testsDirectory.index.packCardTitle("eshop")).toBeVisible();
      await expect(testsDirectory.index.packCardTitle("eshop")).toHaveText(
        "E-shop tím — odolnosť proti scam-u",
      );
    });

    await test.step("Verify the eshop card meta line shows question count and threshold", async () => {
      await expect(testsDirectory.index.packCardMeta("eshop")).toBeVisible();
      await expect(testsDirectory.index.packCardMeta("eshop")).toHaveText("📋 14 otázok · ≥ 70 %");
    });

    await test.step("Verify the eshop card links to /tests/eshop", async () => {
      await expect(testsDirectory.index.packCard("eshop")).toHaveAttribute("href", "/tests/eshop");
    });
  });

  // TC-03: Clicking a pack card navigates to the correct pack landing URL
  test("TC-03: Clicking a pack card navigates to the correct pack landing URL", async ({
    request,
    page,
    testsDirectory,
  }) => {
    test.skip(!(await platformPacksAvailable(request)), PACKS_SKIP_MESSAGE);
    await test.step("Open the /tests catalog page", async () => {
      await testsDirectory.index.open();
    });

    await test.step("Click the eshop pack card", async () => {
      await testsDirectory.index.clickPackCard("eshop");
    });

    await test.step("Verify navigation to /tests/eshop and the page title contains the pack name", async () => {
      await expect(page).toHaveURL(/\/tests\/eshop$/);
      await expect(page).toHaveTitle(/E-shop tím — odolnosť proti scam-u/);
    });
  });

  // ---------------------------------------------------------------------------
  // Negative scenarios
  // ---------------------------------------------------------------------------

  // TC-04: Valid slug — pack landing renders title, tagline, meta and the "Spustiť pack →" CTA
  test('TC-04: Valid slug — pack landing renders title, tagline, meta and the "Spustiť pack →" CTA', async ({
    request,
    testsDirectory,
  }) => {
    test.skip(!(await platformPacksAvailable(request)), PACKS_SKIP_MESSAGE);
    await test.step("Navigate directly to /tests/eshop", async () => {
      await testsDirectory.pack.open("eshop");
    });

    await test.step("Verify the pack heading is visible and correct", async () => {
      await expect(testsDirectory.pack.heading).toBeVisible();
      await expect(testsDirectory.pack.heading).toHaveText("E-shop tím — odolnosť proti scam-u");
    });

    await test.step("Verify the tagline paragraph is visible", async () => {
      await expect(testsDirectory.pack.tagline).toBeVisible();
    });

    await test.step("Verify the meta line showing question count and passing threshold is visible", async () => {
      await expect(testsDirectory.pack.meta).toBeVisible();
    });

    await test.step('Verify the "Spustiť pack →" button is visible and enabled', async () => {
      await expect(testsDirectory.pack.startButton).toBeVisible();
      await expect(testsDirectory.pack.startButton).toBeEnabled();
      await expect(testsDirectory.pack.startButton).toHaveText("Spustiť pack →");
    });
  });

  // TC-05: Invalid slug — the global 404 component is rendered
  test("TC-05: Invalid slug — the global 404 component is rendered", async ({ page, notFound }) => {
    await test.step("Navigate to an invalid pack slug", async () => {
      await page.goto("/tests/this-slug-does-not-exist");
    });

    await test.step('Verify the "Stránka nenájdená" subheading is visible', async () => {
      // The 404 layout renders "Stránka nenájdená" as h1; no literal
      // "404" heading exists (the "chyba 404" text is in a paragraph),
      // so the subheading getter is the reliable anchor.
      await expect(notFound.subheading).toBeVisible();
    });

    await test.step("Verify the URL remains unchanged on the unknown slug route", async () => {
      await expect(page).toHaveURL(/\/tests\/this-slug-does-not-exist$/);
    });
  });
});
