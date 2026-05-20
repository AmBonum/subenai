import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppHelpPage } from "../../poms/app/AppHelpPage";

test.describe("/app/help", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // TC-01: Page renders page header, search input, FAQ list and contact card
  test("TC-01: renders page header, search input, FAQ list and contact card", async ({ page }) => {
    const help = new AppHelpPage(page);

    await test.step("Navigate to /app/help", async () => {
      await help.open();
    });

    await test.step("Verify page header is visible and contains the title copy", async () => {
      await expect(help.pageHeader).toBeVisible();
      // PageHeader splits "Najčastejšie otázky" into head/accent <span>s
      // without a separating text node — assert with `\s*` tolerance.
      await expect(help.pageHeader).toContainText(/Najčastejšie\s*otázky/);
    });

    await test.step("Verify search input is visible", async () => {
      await expect(help.searchInput).toBeVisible();
    });

    await test.step("Verify FAQ accordion list is visible and contains at least one item", async () => {
      await expect(help.faqList).toBeVisible();
      await expect(help.faqItem(0)).toBeVisible();
    });

    await test.step("Verify contact card is visible with CTA and subtitle", async () => {
      await expect(help.contactCard).toBeVisible();
      await expect(help.contactSubtitle).toContainText("support@subenai.sk");
      await expect(help.contactCta).toBeVisible();
    });
  });

  // TC-02: Search filters FAQ items and can be cleared to restore full list
  test("TC-02: search filters FAQ items and clearing restores the full list", async ({ page }) => {
    const help = new AppHelpPage(page);

    await test.step("Navigate to /app/help", async () => {
      await help.open();
    });

    await test.step("Verify multiple FAQ items are visible before filtering", async () => {
      await expect(help.faqItem(0)).toBeVisible();
      await expect(help.faqItem(1)).toBeVisible();
    });

    await test.step('Type "vytvorím nový test" into the search input', async () => {
      await help.searchInput.fill("vytvorím nový test");
    });

    await test.step("Verify the matching FAQ item (item 0) is still visible", async () => {
      await expect(help.faqItem(0)).toBeVisible();
    });

    await test.step("Verify item 1 (unrelated to query) is no longer rendered", async () => {
      await expect(help.faqItem(1)).toHaveCount(0);
    });

    await test.step("Clear the search input", async () => {
      await help.searchInput.fill("");
    });

    await test.step("Verify the full list is restored (item 1 is visible again)", async () => {
      await expect(help.faqItem(1)).toBeVisible();
    });
  });

  // TC-03: FAQ accordion expands on trigger click and collapses on second click
  test("TC-03: FAQ accordion item expands and collapses on trigger click", async ({ page }) => {
    const help = new AppHelpPage(page);

    await test.step("Navigate to /app/help", async () => {
      await help.open();
    });

    await test.step("Verify FAQ content for item 0 is not visible before interaction", async () => {
      await expect(help.faqContent(0)).toBeHidden();
    });

    await test.step("Click the trigger for FAQ item 0", async () => {
      await help.faqTrigger(0).click();
    });

    await test.step("Verify FAQ content for item 0 is now visible and contains the answer copy", async () => {
      await expect(help.faqContent(0)).toBeVisible();
      await expect(help.faqContent(0)).toContainText("Klikni na 'Nový test'");
    });

    await test.step("Click the trigger again to collapse FAQ item 0", async () => {
      await help.faqTrigger(0).click();
    });

    await test.step("Verify FAQ content for item 0 is hidden again", async () => {
      await expect(help.faqContent(0)).toBeHidden();
    });
  });

  // TC-04: Unmatched search renders the empty-state illustration + mailto CTA
  test("TC-04: unmatched search shows the empty-state card with query + mailto CTA", async ({
    page,
  }) => {
    const help = new AppHelpPage(page);

    await test.step("Navigate to /app/help", async () => {
      await help.open();
    });

    await test.step("Type a string that matches no FAQ item", async () => {
      await help.searchInput.fill("xyzzy_no_match_42");
    });

    await test.step("Verify the FAQ accordion list is gone and the empty-state card is visible", async () => {
      await expect(help.faqList).toHaveCount(0);
      await expect(help.emptyState).toBeVisible();
    });

    await test.step("Verify the empty-state title interpolates the typed query", async () => {
      // i18n: help.empty.title = "Pre „{query}" sme nič nenašli"
      await expect(help.emptyStateTitle).toContainText("xyzzy_no_match_42");
    });

    await test.step("Verify the empty-state CTA links to mailto:support@subenai.sk", async () => {
      await expect(help.emptyStateCta).toBeVisible();
      await expect(help.emptyStateCta).toHaveAttribute("href", "mailto:support@subenai.sk");
    });
  });

  // TC-05: Quick-links section exposes deep-links to /privacy, /cookies, /zmeny, /skoly
  test("TC-05: quick-links section deep-links to legal + changelog surfaces", async ({ page }) => {
    const help = new AppHelpPage(page);

    await test.step("Navigate to /app/help", async () => {
      await help.open();
    });

    await test.step("Verify the quick-links section is rendered", async () => {
      await expect(help.quickLinksSection).toBeVisible();
    });

    await test.step("Verify each quick-link card points at the right public-site route", async () => {
      // ROUTES → privacy: "/privacy", cookies: "/cookies",
      // zmeny: "/changelog", skoly: "/schools".
      await expect(help.quickLinkPrivacy).toBeVisible();
      await expect(help.quickLinkPrivacy).toHaveAttribute("href", "/privacy");
      await expect(help.quickLinkCookies).toBeVisible();
      await expect(help.quickLinkCookies).toHaveAttribute("href", "/cookies");
      await expect(help.quickLinkChangelog).toBeVisible();
      await expect(help.quickLinkChangelog).toHaveAttribute("href", "/changelog");
      await expect(help.quickLinkSchools).toBeVisible();
      await expect(help.quickLinkSchools).toHaveAttribute("href", "/schools");
    });
  });

  // TC-06: Contact CTA links to the mailto support address
  test("TC-06: contact CTA links to mailto:support@subenai.sk", async ({ page }) => {
    const help = new AppHelpPage(page);

    await test.step("Navigate to /app/help", async () => {
      await help.open();
    });

    await test.step("Verify the contact CTA is visible and uses the mailto: scheme", async () => {
      await expect(help.contactCta).toBeVisible();
      await expect(help.contactCta).toHaveAttribute("href", "mailto:support@subenai.sk");
    });

    await test.step("Verify the contact CTA label reads the i18n Slovak copy", async () => {
      // i18n: help.contact_button = "Kontaktovať support"
      await expect(help.contactCta).toContainText("Kontaktovať support");
    });
  });
});

test.describe("/app/help — mobile responsive @mobile", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  test("quick-links grid stacks and page renders without horizontal overflow on Pixel 7", async ({
    page,
  }) => {
    const help = new AppHelpPage(page);
    await help.open();

    await expect(help.root).toBeVisible();
    await expect(help.searchInput).toBeVisible();
    await expect(help.faqList).toBeVisible();

    // Quick-links use `grid gap-3 sm:grid-cols-2 lg:grid-cols-4`. At
    // Pixel 7 (412px) we're <sm, so all four cards stack in a single
    // column — card 2 must sit below card 1.
    const card1 = await help.quickLinkPrivacy.boundingBox();
    const card2 = await help.quickLinkCookies.boundingBox();
    expect(card1).not.toBeNull();
    expect(card2).not.toBeNull();
    expect(card2!.y).toBeGreaterThan(card1!.y + card1!.height - 1);

    // FAQ trigger must remain a comfortable tap target.
    const triggerBox = await help.faqTrigger(0).boundingBox();
    expect(triggerBox?.height).toBeGreaterThanOrEqual(32);

    // No horizontal overflow at 412px.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
