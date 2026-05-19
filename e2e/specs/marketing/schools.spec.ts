import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

test.describe("Schools page /schools", () => {
  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  // TC-01: Page renders the heading, hero text, and all six content sections
  test("TC-01: Page renders the heading, hero text, and all six content sections", async ({
    page,
    schools,
  }) => {
    await test.step("Open /schools at 1280×800 with no active session", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Verify the h1 heading is visible with text 'Pre školy, lektorov a HR'", async () => {
      await expect(schools.heading).toBeVisible();
      await expect(schools.heading).toHaveText("Pre školy, lektorov a HR");
    });

    await test.step("Verify the hero paragraph is visible and contains 'Edu mód v Composeri'", async () => {
      await expect(schools.heroParagraph).toBeVisible();
      await expect(schools.heroParagraph).toContainText("Edu mód v Composeri");
    });

    await test.step("Verify h2 heading 'Čo to je' is visible", async () => {
      await expect(schools.whatHeading).toBeVisible();
      await expect(schools.whatHeading).toHaveText("Čo to je");
    });

    await test.step("Verify h2 heading 'Krok 1: Vytvor test' is visible", async () => {
      await expect(schools.step1Heading).toBeVisible();
      await expect(schools.step1Heading).toHaveText("Krok 1: Vytvor test");
    });

    await test.step("Verify h2 heading 'Krok 2: Zapni edu mód a heslo' is visible", async () => {
      await expect(schools.step2Heading).toBeVisible();
      await expect(schools.step2Heading).toHaveText("Krok 2: Zapni edu mód a heslo");
    });

    await test.step("Verify h2 heading 'Krok 3: Pošli link respondentom' is visible", async () => {
      await expect(schools.step3Heading).toBeVisible();
      await expect(schools.step3Heading).toHaveText("Krok 3: Pošli link respondentom");
    });

    await test.step("Verify h2 heading 'Krok 4: Pozri výsledky' is visible", async () => {
      await expect(schools.step4Heading).toBeVisible();
      await expect(schools.step4Heading).toHaveText("Krok 4: Pozri výsledky");
    });

    await test.step("Verify h2 heading 'GDPR — tvoja rola autora' is visible", async () => {
      await expect(schools.gdprHeading).toBeVisible();
      await expect(schools.gdprHeading).toHaveText("GDPR — tvoja rola autora");
    });

    await test.step("Verify FAQ heading 'Časté otázky' is visible", async () => {
      await expect(schools.faqHeading).toBeVisible();
      await expect(schools.faqHeading).toHaveText("Časté otázky");
    });
  });

  // TC-02: "Composer" links in the body navigate to `/test/zostav`
  test("TC-02: Composer links in the body have href /test/zostav", async ({ page, schools }) => {
    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Verify 'Composer-om' link in the 'Čo to je' section has href /test/zostav", async () => {
      await expect(schools.composerLinkWhat).toBeVisible();
      await expect(schools.composerLinkWhat).toHaveAttribute("href", "/test/zostav");
    });

    await test.step("Verify 'Composer' link in the step-1 list item has href /test/zostav", async () => {
      await expect(schools.composerLinkStep1).toBeVisible();
      await expect(schools.composerLinkStep1).toHaveAttribute("href", "/test/zostav");
    });

    await test.step("Verify outro-card 'Composer' link has href /test/zostav", async () => {
      await expect(schools.outroComposerLink).toBeVisible();
      await expect(schools.outroComposerLink).toHaveAttribute("href", "/test/zostav");
    });
  });

  // TC-03: Page title and robots meta are correct
  test("TC-03: Page title and robots meta are correct", async ({ page, schools }) => {
    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Verify document.title equals 'Pre školy a vzdelávacie inštitúcie — subenai'", async () => {
      await expect(page).toHaveTitle("Pre školy a vzdelávacie inštitúcie — subenai");
    });

    await test.step("Verify meta[name='robots'] content is 'index, follow'", async () => {
      const content = await schools.robotsContent();
      expect(content).toBe("index, follow");
    });

    await test.step("Verify meta[name='description'] contains 'edu test'", async () => {
      const desc = await schools.descriptionContent();
      expect(desc).not.toBeNull();
      expect(desc).toContain("edu test");
    });
  });

  // TC-04: DPA and outro email links resolve to `mailto:subenai.podpora@gmail.com`
  test("TC-04: DPA and outro email links resolve to mailto:subenai.podpora@gmail.com", async ({
    page,
    schools,
  }) => {
    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Verify the GDPR DPA email link has href mailto:subenai.podpora@gmail.com", async () => {
      await expect(schools.gdprDpaEmailLink).toBeVisible();
      await expect(schools.gdprDpaEmailLink).toHaveAttribute(
        "href",
        "mailto:subenai.podpora@gmail.com",
      );
    });

    await test.step("Verify the outro card email link has href mailto:subenai.podpora@gmail.com", async () => {
      await expect(schools.outroEmailLink).toBeVisible();
      await expect(schools.outroEmailLink).toHaveAttribute(
        "href",
        "mailto:subenai.podpora@gmail.com",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Negative scenarios
  // ---------------------------------------------------------------------------

  // TC-05: "zásady spracovania" link in the GDPR section navigates to `/privacy`
  test("TC-05: 'zásady spracovania' link in the GDPR section has href /privacy", async ({
    page,
    schools,
  }) => {
    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Verify the 'zásady spracovania' link has href /privacy", async () => {
      await expect(schools.gdprPrivacyLink).toBeVisible();
      await expect(schools.gdprPrivacyLink).toHaveAttribute("href", "/privacy");
    });
  });

  // TC-06: Email template `<details>` is collapsed by default and expands on click
  test("TC-06: Email template details is collapsed by default and expands on click", async ({
    page,
    schools,
  }) => {
    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Verify the details element does not have the open attribute by default", async () => {
      await expect(schools.emailTemplateDetails).not.toHaveAttribute("open");
    });

    await test.step("Click the summary to expand the email template", async () => {
      await schools.emailTemplateSummary.click();
    });

    await test.step("Verify the pre block is visible and contains 'Predmet: Test rozpoznávania scamov'", async () => {
      await expect(schools.emailTemplatePre).toBeVisible();
      await expect(schools.emailTemplatePre).toContainText("Predmet: Test rozpoznávania scamov");
    });
  });

  // TC-07: "← Späť na domov" link navigates to `/`
  test("TC-07: Back-home link navigates to /", async ({ page, schools }) => {
    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Click '← Späť na domov' and verify navigation to /", async () => {
      await schools.backLink.click();
      await expect(page).toHaveURL(/\/$/);
    });
  });

  // TC-08: No JavaScript console errors on clean page load
  test("TC-08: No JavaScript console errors on clean page load", async ({ page, schools }) => {
    const errors: string[] = [];

    await test.step("Register console error listener before navigation", async () => {
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => {
        errors.push(err.message);
      });
    });

    await test.step("Navigate to /schools at 1280×800 with a clean session", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Verify there are zero console errors", async () => {
      expect(errors).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  // TC-09: Mobile viewport (375×667) — heading and outro card are fully visible without horizontal overflow
  test("TC-09: Mobile viewport 375×667 — heading and outro card visible without horizontal overflow", async ({
    page,
    schools,
  }) => {
    await test.step("Set mobile viewport 375×667 and open /schools", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await schools.open();
    });

    await test.step("Verify the h1 heading is visible within the viewport", async () => {
      await expect(schools.heading).toBeVisible();
    });

    await test.step("Verify there is no horizontal overflow", async () => {
      const hasOverflow = await schools.hasHorizontalOverflow();
      expect(hasOverflow).toBe(false);
    });

    await test.step("Scroll to bottom and verify the outro card is visible", async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(schools.outroCard).toBeVisible();
    });
  });

  // TC-10: Tablet viewport (768×1024) — prose article renders without overflow
  test("TC-10: Tablet viewport 768×1024 — prose article renders without overflow", async ({
    page,
    schools,
  }) => {
    await test.step("Set tablet viewport 768×1024 and open /schools", async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await schools.open();
    });

    // Tightened from content-scoped to document-scoped 2026-05-19 after
    // SiteHeader 768px overflow fix landed. Now asserts the entire
    // document fits within 768px viewport (no horizontal scroll on the
    // page at all), not just the <main> content.
    await test.step("Verify no horizontal overflow on the document", async () => {
      const hasOverflow = await schools.hasHorizontalOverflow();
      expect(hasOverflow).toBe(false);
    });

    await test.step("Scroll through the page and verify all six h2 section headings are visible", async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(schools.whatHeading).toBeVisible();
      await expect(schools.step1Heading).toBeVisible();
      await expect(schools.step2Heading).toBeVisible();
      await expect(schools.step3Heading).toBeVisible();
      await expect(schools.step4Heading).toBeVisible();
      await expect(schools.gdprHeading).toBeVisible();
    });

    await test.step("Expand the email template details and verify no overflow is introduced", async () => {
      await schools.emailTemplateSummary.click();
      await expect(schools.emailTemplatePre).toBeVisible();
      const hasOverflow = await schools.hasHorizontalOverflow();
      expect(hasOverflow).toBe(false);
    });
  });

  // TC-11: Keyboard-only navigation reaches the first Composer CTA without a mouse
  test("TC-11: Keyboard-only navigation reaches the first Composer CTA", async ({
    page,
    schools,
    context,
  }) => {
    await test.step("Prime consent so focus is not trapped in the consent banner", async () => {
      await primeConsent(context, "all");
    });

    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Tab from the top of the document until focus reaches the 'Composer-om' link", async () => {
      let focused = false;
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press("Tab");
        const isFocused = await schools.composerLinkWhat.evaluate(
          (el) => el === document.activeElement,
        );
        if (isFocused) {
          focused = true;
          break;
        }
      }
      expect(focused).toBe(true);
    });

    await test.step("Press Enter on the focused link and verify navigation to /test/zostav", async () => {
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/test\/zostav/);
    });
  });

  // TC-12: XSS payload in URL hash does not execute on the page
  test("TC-12: XSS payload in URL hash does not execute on the page", async ({ page, schools }) => {
    await test.step("Navigate to /schools with an XSS payload in the hash", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/schools#<img src=x onerror=window.__xss=1>", {
        waitUntil: "domcontentloaded",
      });
    });

    await test.step("Verify window.__xss is undefined in the page context", async () => {
      const marker = await schools.xssMarker();
      expect(marker).toBeUndefined();
    });

    await test.step("Verify the heading 'Pre školy, lektorov a HR' renders normally", async () => {
      await expect(schools.heading).toBeVisible();
      await expect(schools.heading).toHaveText("Pre školy, lektorov a HR");
    });
  });

  // TC-13: FAQ section lists all six questions
  test("TC-13: FAQ section lists all six questions", async ({ page, schools }) => {
    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Scroll to the 'Časté otázky' section", async () => {
      await schools.faqHeading.scrollIntoViewIfNeeded();
    });

    await test.step("Verify all six FAQ dt question terms are visible", async () => {
      await expect(schools.faqDts).toHaveCount(6);
      await expect(schools.faqDts.nth(0)).toContainText(
        "Stratil/a som heslo. Môžete mi ho resetovať?",
      );
      await expect(schools.faqDts.nth(1)).toContainText("Ako dlho sa uchovávajú odpovede?");
      await expect(schools.faqDts.nth(2)).toContainText("Môžem zmazať konkrétneho študenta?");
      await expect(schools.faqDts.nth(3)).toContainText(
        "Koľko respondentov môže absolvovať jeden test?",
      );
      await expect(schools.faqDts.nth(4)).toContainText("Môže sa študent prihlásiť opakovane?");
      await expect(schools.faqDts.nth(5)).toContainText("Funguje to na mobile?");
    });

    await test.step("Verify each dt is followed by a dd within its parent div", async () => {
      await expect(schools.faqDivs).toHaveCount(6);
      for (let i = 0; i < 6; i++) {
        await expect(schools.faqDdAt(i)).toBeVisible();
      }
    });
  });

  // TC-14: Step-4 result-set bullet list renders all five items including the CSV export emphasis
  test("TC-14: Step-4 bullet list renders all five items with CSV export and session notice", async ({
    page,
    schools,
  }) => {
    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Scroll to the 'Krok 4: Pozri výsledky' section", async () => {
      await schools.step4Heading.scrollIntoViewIfNeeded();
    });

    await test.step("Verify the unordered list after step-4 heading contains exactly five items", async () => {
      await expect(schools.step4ListItems).toHaveCount(5);
    });

    await test.step("Verify the fifth item contains bold text 'CSV export'", async () => {
      await expect(schools.step4ListItem5Strong).toHaveText("CSV export");
    });

    await test.step("Verify the brute-force notice 'Session vydrží 60 minút' is visible", async () => {
      await expect(schools.step4SessionNotice).toContainText("Session vydrží 60 minút");
    });
  });

  // TC-15: GDPR section renders controller/processor split correctly
  test("TC-15: GDPR section renders controller/processor split correctly", async ({
    page,
    schools,
  }) => {
    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Scroll to the 'GDPR — tvoja rola autora' section", async () => {
      await schools.gdprHeading.scrollIntoViewIfNeeded();
    });

    await test.step("Verify the paragraph contains bold text 'ty kontrolór'", async () => {
      await expect(schools.gdprParagraphStrong("ty kontrolór")).toBeVisible();
    });

    await test.step("Verify the paragraph contains bold text 'am.bonum s. r. o.'", async () => {
      await expect(schools.gdprParagraphStrong("am.bonum s. r. o.")).toBeVisible();
    });

    await test.step("Verify the paragraph contains bold text 'sprostredkovateľ'", async () => {
      await expect(schools.gdprParagraphStrong("sprostredkovateľ")).toBeVisible();
    });

    await test.step("Verify the 'Doba uchovávania:' bullet contains '12 mesiacov'", async () => {
      await expect(schools.gdprListFirstItem).toContainText("12 mesiacov");
    });
  });

  // TC-16: Outro card footer line shows correct site origin and entity name
  test("TC-16: Outro card footer line shows correct site origin and entity name", async ({
    page,
    schools,
  }) => {
    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Scroll to the outro card", async () => {
      await schools.outroCard.scrollIntoViewIfNeeded();
    });

    await test.step("Verify the card footer paragraph contains bold text 'https://subenai.sk'", async () => {
      await expect(schools.outroCardFooterParagraph.locator("strong")).toHaveText(
        "https://subenai.sk",
      );
    });

    await test.step("Verify the card footer paragraph contains 'am.bonum s. r. o.'", async () => {
      await expect(schools.outroCardFooterParagraph).toContainText("am.bonum s.");
    });
  });

  // TC-17: Page does not carry a `noindex` directive
  test("TC-17: Page does not carry a noindex directive", async ({ page, schools }) => {
    await test.step("Open /schools at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await schools.open();
    });

    await test.step("Verify no meta[name='robots'] tag with noindex is present", async () => {
      const hasNoindex = await schools.hasNoindexMeta();
      expect(hasNoindex).toBe(false);
    });

    await test.step("Verify document.title is non-empty (confirming head() ran)", async () => {
      await expect(page).not.toHaveTitle("");
    });
  });
});
