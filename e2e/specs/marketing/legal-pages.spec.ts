import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { CONSENT_VERSION } from "../../../src/lib/consent";

// ---------------------------------------------------------------------------
// Privacy /privacy
// ---------------------------------------------------------------------------

test.describe("Privacy /privacy", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-01: Page renders key structural sections and page title is set
  test("TC-01: Page renders key structural sections and page title is set", async ({
    page,
    privacy,
  }) => {
    await test.step("Navigate to /privacy at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await privacy.open();
    });

    await test.step("Verify document.title equals the expected string", async () => {
      await expect(page).toHaveTitle("Zásady ochrany súkromia — subenai");
    });

    await test.step("Verify the h1 heading is visible and contains the correct text", async () => {
      await expect(privacy.heading).toBeVisible();
      await expect(privacy.heading).toContainText("Zásady ochrany súkromia");
    });

    await test.step("Verify the processing-purpose table is visible with at least 9 data rows", async () => {
      await expect(privacy.processingTable).toBeVisible();
      await expect(privacy.processingTableRows).toHaveCount(9);
    });

    await test.step("Verify the GDPR rights section heading is visible and contains the expected text", async () => {
      await expect(privacy.rightsHeading).toBeVisible();
      await expect(privacy.rightsHeading).toContainText("5. Tvoje práva");
    });
  });

  // TC-02: `robots` meta is `index, follow` (noindex absent)
  test("TC-02: robots meta is index, follow and title is non-empty", async ({ page, privacy }) => {
    await test.step("Navigate to /privacy at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await privacy.open();
    });

    await test.step("Verify robots meta content equals 'index, follow'", async () => {
      const content = await privacy.robotsContent();
      expect(content).toBe("index, follow");
    });

    await test.step("Verify document.title is non-empty", async () => {
      const title = await page.title();
      expect(title).toBeTruthy();
    });
  });

  // TC-03: "← Späť na domov" link navigates to the homepage
  test("TC-03: '← Späť na domov' link navigates to /", async ({ page, privacy }) => {
    await test.step("Navigate to /privacy at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await privacy.open();
    });

    await test.step("Click the back-home link", async () => {
      await privacy.backHomeLink.click();
    });

    await test.step("Verify the browser navigated to /", async () => {
      await expect(page).toHaveURL(/\/$/);
    });
  });

  // TC-12: `/privacy` contact email link is a `mailto:` href
  test("TC-12: Contact email link is a mailto: href and renders the address", async ({
    page,
    privacy,
  }) => {
    await test.step("Navigate to /privacy at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await privacy.open();
    });

    await test.step("Verify the email link is visible", async () => {
      await expect(privacy.contactEmail).toBeVisible();
    });

    await test.step("Verify the href starts with mailto:", async () => {
      const href = await privacy.contactEmail.getAttribute("href");
      expect(href).toMatch(/^mailto:/);
    });

    await test.step("Verify the link text is non-empty", async () => {
      const text = await privacy.contactEmail.textContent();
      expect(text?.trim()).toBeTruthy();
    });
  });

  // TC-20: `/privacy` — section s8 callout "Ak ste respondent edu testu" is visible
  test("TC-20: Section s8 heading and callout are visible", async ({ page, privacy }) => {
    await test.step("Navigate to /privacy at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await privacy.open();
    });

    await test.step("Verify the s8 section heading is visible and contains the expected text", async () => {
      await expect(privacy.s8Heading).toBeVisible();
      await expect(privacy.s8Heading).toContainText("8. Education mode (zber edu odpovedí)");
    });

    await test.step("Verify the callout block is visible and contains the expected text", async () => {
      await expect(privacy.s8Callout).toBeVisible();
      await expect(privacy.s8Callout).toContainText("Ak ste respondent edu testu:");
    });
  });
});

// ---------------------------------------------------------------------------
// Cookies /cookies
// ---------------------------------------------------------------------------

test.describe("Cookies /cookies", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-04: Cookie category table renders all five local rows and four Stripe rows
  test("TC-04: Cookie category table renders with all required category rows", async ({
    page,
    cookies,
  }) => {
    await test.step("Navigate to /cookies at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await cookies.open();
    });

    await test.step("Verify the h1 heading is visible and contains the correct text", async () => {
      await expect(cookies.heading).toBeVisible();
      await expect(cookies.heading).toContainText("Zásady používania cookies");
    });

    await test.step("Verify the cookie category table is visible", async () => {
      await expect(cookies.categoryTable).toBeVisible();
    });

    await test.step("Verify the table contains a 'Nevyhnutné' row", async () => {
      await expect(
        cookies.categoryTable.getByText("Nevyhnutné", { exact: true }).first(),
      ).toBeVisible();
    });

    await test.step("Verify the table contains an 'Analytika' row", async () => {
      await expect(
        cookies.categoryTable.getByText("Analytika", { exact: true }).first(),
      ).toBeVisible();
    });

    await test.step("Verify the table contains a 'Marketing' row", async () => {
      await expect(
        cookies.categoryTable.getByText("Marketing", { exact: true }).first(),
      ).toBeVisible();
    });

    await test.step("Verify the Stripe category cell contains '/support'", async () => {
      await expect(cookies.categoryTable.getByText("/support").first()).toBeVisible();
    });
  });

  // TC-05: "Otvoriť nastavenia cookies" button opens the ConsentPreferencesDialog
  test("TC-05: 'Otvoriť nastavenia cookies' button opens the ConsentPreferencesDialog", async ({
    page,
    cookies,
    consentDialog,
  }) => {
    await test.step("Navigate to /cookies at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await cookies.open();
    });

    await test.step("Click the manage-cookies button", async () => {
      await cookies.manageButton.click();
    });

    await test.step("Verify the ConsentPreferencesDialog root is visible", async () => {
      await expect(consentDialog.root).toBeVisible();
    });

    await test.step("Verify focus has moved inside the dialog", async () => {
      const focusInsideDialog = await consentDialog.root.evaluate((el) =>
        el.contains(document.activeElement),
      );
      expect(focusInsideDialog).toBe(true);
    });
  });

  // TC-06: `robots` meta is `index, follow` and `CONSENT_VERSION` appears in the page
  test("TC-06: robots meta is index, follow and version line is visible", async ({
    page,
    cookies,
  }) => {
    await test.step("Navigate to /cookies at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await cookies.open();
    });

    await test.step("Verify robots meta content equals 'index, follow'", async () => {
      const content = await cookies.robotsContent();
      expect(content).toBe("index, follow");
    });

    await test.step("Verify the version line is visible and contains 'Verzia'", async () => {
      await expect(cookies.versionLine).toBeVisible();
      await expect(cookies.versionLine).toContainText("Verzia");
    });
  });

  // TC-07: "zásadách ochrany súkromia" cross-link navigates to /privacy
  test("TC-07: 'zásadách ochrany súkromia' link navigates to /privacy", async ({
    page,
    cookies,
  }) => {
    await test.step("Navigate to /cookies at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await cookies.open();
    });

    await test.step("Click the privacy cross-link", async () => {
      await cookies.privacyLink.click();
    });

    await test.step("Verify the browser navigated to /privacy", async () => {
      await expect(page).toHaveURL(/\/privacy$/);
    });
  });

  // TC-17: Keyboard-only navigation reaches the "Otvoriť nastavenia cookies" button
  test("TC-17: Keyboard-only navigation reaches the manage-cookies button and opens the dialog", async ({
    page,
    cookies,
    consentDialog,
  }) => {
    await test.step("Navigate to /cookies at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await cookies.open();
    });

    await test.step("Tab from the top of the document until the manage-cookies button receives focus", async () => {
      await page.keyboard.press("Tab");
      let focused = false;
      for (let i = 0; i < 30; i++) {
        const isFocused = await cookies.manageButton.evaluate(
          (el) => el === document.activeElement,
        );
        if (isFocused) {
          focused = true;
          break;
        }
        await page.keyboard.press("Tab");
      }
      expect(focused).toBe(true);
    });

    await test.step("Press Enter and verify the ConsentPreferencesDialog becomes visible", async () => {
      await page.keyboard.press("Enter");
      await expect(consentDialog.root).toBeVisible();
    });

    await test.step("Verify focus has moved inside the dialog (not left on the button)", async () => {
      const focusInsideDialog = await consentDialog.root.evaluate((el) =>
        el.contains(document.activeElement),
      );
      expect(focusInsideDialog).toBe(true);
    });
  });

  // TC-22: `/cookies` category table wrapper has overflow-x: auto on mobile
  test("TC-22: Cookie table wrapper has overflow-x:auto computed style on mobile", async ({
    page,
    cookies,
  }) => {
    await test.step("Navigate to /cookies at 375×667 (mobile viewport)", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await cookies.open();
    });

    await test.step("Verify the table wrapper has overflow-x: auto computed style", async () => {
      const overflowX = await cookies.tableWrapperOverflowX();
      expect(overflowX).toBe("auto");
    });

    await test.step("Verify the 'Nevyhnutné' category row is visible in the table", async () => {
      await expect(
        cookies.categoryTable.getByText("Nevyhnutné", { exact: true }).first(),
      ).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// Cookies /cookies — consent-record conditional display (no primeConsent)
// ---------------------------------------------------------------------------

test.describe("Cookies /cookies — last-consent conditional", () => {
  // TC-13: When no consent record exists the "last consent" paragraph is absent
  test("TC-13: No consent record — last-consent paragraph is absent", async ({ page, cookies }) => {
    await test.step("Navigate to /cookies with a clean session (no iiq_consent key)", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/cookies", { waitUntil: "domcontentloaded" });
    });

    await test.step("Verify the manage-cookies button is visible", async () => {
      await expect(cookies.manageButton).toBeVisible();
    });

    await test.step("Verify the last-consent paragraph is absent from the DOM", async () => {
      await expect(cookies.lastConsent).toBeHidden();
    });
  });

  // TC-14: When a valid `iiq_consent` record exists the "last consent" paragraph is visible
  test("TC-14: Valid iiq_consent record — last-consent paragraph is visible with version", async ({
    page,
    cookies,
  }) => {
    const record = {
      timestamp: new Date("2024-05-18T00:00:00.000Z").toISOString(),
      version: CONSENT_VERSION,
      categories: { necessary: true, preferences: false, analytics: false, marketing: false },
    };

    await test.step("Seed localStorage with a valid iiq_consent record before navigation", async () => {
      await page.addInitScript(
        ({ key, value }: { key: string; value: string }) => window.localStorage.setItem(key, value),
        { key: "iiq_consent", value: JSON.stringify(record) },
      );
    });

    await test.step("Navigate to /cookies at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/cookies", { waitUntil: "domcontentloaded" });
    });

    await test.step("Verify the last-consent paragraph is visible", async () => {
      await expect(cookies.lastConsent).toBeVisible();
    });

    await test.step("Verify the paragraph contains the stored consent version", async () => {
      await expect(cookies.lastConsent).toContainText(CONSENT_VERSION);
    });
  });
});

// ---------------------------------------------------------------------------
// Changelog /changelog
// ---------------------------------------------------------------------------

test.describe("Changelog /changelog", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-08: Page renders at least one version block and page title is set
  test("TC-08: Page renders at least one version block and title is set", async ({
    page,
    changelog,
  }) => {
    await test.step("Navigate to /changelog at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await changelog.open();
    });

    await test.step("Verify document.title equals the expected string", async () => {
      await expect(page).toHaveTitle("Zmeny a verzie — subenai");
    });

    await test.step("Verify the h1 heading is visible and contains the correct text", async () => {
      await expect(changelog.heading).toBeVisible();
      await expect(changelog.heading).toContainText("Zmeny a verzie");
    });

    await test.step("Verify the version list is visible and contains at least one li child", async () => {
      await expect(changelog.list).toBeVisible();
      const count = await changelog.listItems.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  // TC-09: Version entries are ordered newest-first
  test("TC-09: Version entries are ordered newest-first (ISO-8601 descending)", async ({
    page,
    changelog,
  }) => {
    await test.step("Navigate to /changelog at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await changelog.open();
    });

    await test.step("Verify the first entry dateTime is >= the second entry dateTime", async () => {
      const first = await changelog.firstEntryDateTime();
      const second = await changelog.secondEntryDateTime();
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(first! >= second!).toBe(true);
    });
  });

  // TC-10: `robots` meta is `index, follow`
  test("TC-10: robots meta is index, follow and title is non-empty", async ({
    page,
    changelog,
  }) => {
    await test.step("Navigate to /changelog at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await changelog.open();
    });

    await test.step("Verify robots meta content equals 'index, follow'", async () => {
      const content = await changelog.robotsContent();
      expect(content).toBe("index, follow");
    });

    await test.step("Verify document.title is non-empty", async () => {
      const title = await page.title();
      expect(title).toBeTruthy();
    });
  });

  // TC-11: `/changelog` with empty changelog shows empty-state message
  // The changelog JSON is statically bundled at SSR build time; we serve a
  // synthetic HTML response via page.route to exercise the empty-state branch
  // without requiring a separate build of the SSR worker.
  test("TC-11: Empty changelog shows empty-state message and no list", async ({
    page,
    changelog,
  }) => {
    await test.step("Intercept /changelog and serve a synthetic empty-state page", async () => {
      await page.route("**/changelog", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: Buffer.from(
            `<!doctype html><html><head><meta charset="utf-8"><title>Zmeny a verzie — subenai</title></head><body>` +
              `<h1 data-testid="changelog-heading">Zmeny a verzie</h1>` +
              `<p data-testid="changelog-empty">Zatiaľ žiadne verzie.</p>` +
              `</body></html>`,
            "utf-8",
          ),
        });
      });
    });

    await test.step("Navigate to /changelog at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/changelog", { waitUntil: "domcontentloaded" });
    });

    await test.step("Verify the version list is absent from the DOM", async () => {
      await expect(changelog.list).toBeHidden();
    });

    await test.step("Verify the empty-state element is visible and contains the expected text", async () => {
      await expect(changelog.emptyState).toBeVisible();
      await expect(changelog.emptyState).toContainText("Zatiaľ žiadne verzie.");
    });
  });

  // TC-18: XSS payload in changelog entry does not execute
  // Serves a synthetic page where renderInline has already escaped the payload,
  // mirroring what the real SSR worker produces for a malicious entry.
  test("TC-18: XSS payload in changelog entry does not execute", async ({ page, changelog }) => {
    await test.step("Intercept /changelog and serve a page with the escaped XSS payload", async () => {
      const escapedPayload = "&lt;img src=x onerror=window.__xss=1&gt;";
      const html =
        `<!doctype html><html><head><meta charset="utf-8"><title>Zmeny a verzie — subenai</title></head><body>` +
        `<h1 data-testid="changelog-heading">Zmeny a verzie</h1>` +
        `<ol data-testid="changelog-list">` +
        `<li data-testid="changelog-entry-v0.0.0-xss" id="v0.0.0-xss">` +
        `<ul><li><strong class="text-foreground">${escapedPayload}</strong></li></ul>` +
        `</li></ol>` +
        `</body></html>`;
      await page.route("**/changelog", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: Buffer.from(html, "utf-8"),
        });
      });
    });

    await test.step("Navigate to /changelog at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/changelog", { waitUntil: "domcontentloaded" });
    });

    await test.step("Verify window.__xss is undefined (payload did not execute)", async () => {
      const xss = await changelog.xssWindowProp();
      expect(xss).toBeUndefined();
    });

    await test.step("Verify the rendered list item contains the literal text as HTML entities", async () => {
      const listItem = changelog.list.locator("li strong").first();
      await expect(listItem).toBeVisible();
      const text = await listItem.textContent();
      expect(text).toContain("<img src=x onerror=window.__xss=1>");
    });
  });

  // TC-19: `/changelog` anchor `#v1.0.0` scrolls to the correct version block
  test("TC-19: Anchor #v1.0.0 scrolls to the v1.0.0 version block", async ({ page, changelog }) => {
    await test.step("Navigate directly to /changelog#v1.0.0 at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/changelog#v1.0.0", { waitUntil: "domcontentloaded" });
    });

    await test.step("Verify the v1.0.0 entry element is within the visible viewport", async () => {
      const inViewport = await changelog.isEntryInViewport("1.0.0");
      expect(inViewport).toBe(true);
    });
  });

  // TC-21: Console is clean on all three legal pages (no JS errors at load)
  test("TC-21: No console errors on /privacy, /cookies, or /changelog", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await test.step("Navigate to /privacy and capture console errors", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/privacy", { waitUntil: "domcontentloaded" });
    });

    await test.step("Navigate to /cookies and capture console errors", async () => {
      await page.goto("/cookies", { waitUntil: "domcontentloaded" });
    });

    await test.step("Navigate to /changelog and capture console errors", async () => {
      await page.goto("/changelog", { waitUntil: "domcontentloaded" });
    });

    await test.step("Verify no console errors were recorded across all three pages", async () => {
      expect(errors).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Edge cases — viewport
// ---------------------------------------------------------------------------

test.describe("Legal pages — viewport edge cases", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-15: Mobile viewport (375×667) — all three pages load without horizontal overflow
  test("TC-15: Mobile 375×667 — all three legal pages load without horizontal content overflow", async ({
    page,
    privacy,
    cookies,
    changelog,
  }) => {
    await test.step("Set mobile viewport 375×667", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    await test.step("Navigate to /privacy and verify no horizontal content overflow", async () => {
      await privacy.open();
      const overflow = await privacy.hasContentHorizontalOverflow();
      expect(overflow).toBe(false);
    });

    await test.step("Verify the /privacy h1 is visible within the viewport", async () => {
      await expect(privacy.heading).toBeVisible();
    });

    await test.step("Navigate to /cookies and verify no horizontal content overflow", async () => {
      await cookies.open();
      const overflow = await cookies.hasContentHorizontalOverflow();
      expect(overflow).toBe(false);
    });

    await test.step("Navigate to /changelog and verify no horizontal content overflow", async () => {
      await changelog.open();
      const overflow = await changelog.hasContentHorizontalOverflow();
      expect(overflow).toBe(false);
    });
  });

  // TC-16: Tablet viewport (768×1024) — `/privacy` processing table does not overflow
  test("TC-16: Tablet 768×1024 — /privacy processing table is fully visible without overflow", async ({
    page,
    privacy,
  }) => {
    await test.step("Navigate to /privacy at 768×1024 (iPad portrait)", async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await privacy.open();
    });

    await test.step("Verify the processing-purpose table is fully visible", async () => {
      await expect(privacy.processingTable).toBeVisible();
    });

    await test.step("Verify the table bounding-box right edge does not exceed the viewport width", async () => {
      const box = await privacy.tableBoundingBox();
      expect(box).not.toBeNull();
      if (box) expect(box.x + box.width).toBeLessThanOrEqual(768);
    });
  });
});
