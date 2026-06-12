import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { TOPIC_SLUGS } from "../../poms/marketing/ContactPage";

// /contact is a hub that routes everything to the web ticket form at
// /contact-form. The main CTA opens the bare form; each of the six topic
// cards deep-links with ?topic=<slug> which preselects the matching
// category and prefills the subject on the form. The e-mail address
// remains only as a plain-text fallback in the copy + operator card.

test.describe("Contact page /contact", () => {
  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  // TC-01: Page renders with correct title, heading, form CTA, and topic links
  test("TC-01: Page renders with correct title, heading, form CTA and all topic links", async ({
    page,
    contact,
  }) => {
    await test.step("Open /contact at 1280×800 with no prior consent", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await contact.open();
    });

    await test.step("Verify the browser tab title is 'Kontakt — subenai'", async () => {
      await expect(page).toHaveTitle("Kontakt — subenai");
    });

    await test.step("Verify the h1 heading reads 'Kontakt'", async () => {
      await expect(contact.heading).toBeVisible();
      await expect(contact.heading).toHaveText("Kontakt");
    });

    await test.step("Verify the primary CTA 'Otvoriť kontaktný formulár' is visible", async () => {
      await expect(contact.mainFormLink).toBeVisible();
      await expect(contact.mainFormLink).toContainText("Otvoriť kontaktný formulár");
    });

    await test.step("Verify all six topic links are visible in the topics list", async () => {
      await expect(contact.topicsList).toBeVisible();
      for (const slug of TOPIC_SLUGS) {
        await expect(contact.topicLink(slug)).toBeVisible();
      }
    });

    await test.step("Verify the operator card with heading 'Prevádzkovateľ' is visible", async () => {
      await expect(contact.operatorCard).toBeVisible();
      await expect(contact.operatorCard.getByRole("heading", { level: 2 })).toHaveText(
        "Prevádzkovateľ",
      );
    });
  });

  // TC-02: Primary CTA links to the web form (no mailto)
  test("TC-02: Primary CTA links to /contact-form, not a mailto", async ({ contact }) => {
    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Verify the CTA href is '/contact-form'", async () => {
      const href = await contact.mainFormLink.getAttribute("href");
      expect(href).toBe("/contact-form");
    });
  });

  // TC-03: Topic links deep-link to /contact-form?topic=<slug>
  test("TC-03: All six topic links carry their ?topic= deep-link and are unique", async ({
    contact,
  }) => {
    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Verify each topic href is /contact-form?topic=<slug>", async () => {
      const hrefs = await contact.allTopicHrefs();
      for (const slug of TOPIC_SLUGS) {
        expect(hrefs[slug]).toBe(`/contact-form?topic=${slug}`);
      }
    });

    await test.step("Verify all six hrefs are distinct", async () => {
      const hrefs = Object.values(await contact.allTopicHrefs());
      expect(new Set(hrefs).size).toBe(6);
    });
  });

  // TC-04: "← Späť na domov" link navigates to the home page
  test("TC-04: '← Späť na domov' link navigates to the home page", async ({
    page,
    contact,
    context,
    marketingHome,
  }) => {
    await test.step("Prime consent and open /contact", async () => {
      await primeConsent(context, "all");
      await contact.open();
    });

    await test.step("Click '← Späť na domov'", async () => {
      await contact.backLink.click();
    });

    await test.step("Verify the browser navigated to / with no 404 or error page", async () => {
      await expect(page).toHaveURL(/\/$/);
      await expect(marketingHome.pageH1).toBeVisible();
    });
  });

  // TC-05: Clicking the GDPR topic card lands on the prefilled form
  test("TC-05: GDPR topic card opens /contact-form with preselected category + prefilled subject", async ({
    page,
    contact,
    context,
    kontakt,
  }) => {
    await test.step("Prime consent and open /contact", async () => {
      await primeConsent(context, "all");
      await contact.open();
    });

    await test.step("Click the GDPR topic card", async () => {
      await contact.topicLink("gdpr").click();
    });

    await test.step("Verify the browser navigated to /contact-form?topic=gdpr", async () => {
      await expect(page).toHaveURL(/\/contact-form\?topic=gdpr$/);
      await expect(kontakt.root).toBeVisible();
    });

    await test.step("Verify the subject is prefilled with 'GDPR žiadosť'", async () => {
      await expect(kontakt.subjectInput).toHaveValue("GDPR žiadosť");
    });

    await test.step("Verify the category select shows 'Žiadosť o údaje (GDPR)'", async () => {
      await expect(kontakt.categorySelect).toContainText("Žiadosť o údaje (GDPR)");
    });
  });

  // TC-06: Fallback plain-text email address is visible for copy-paste
  test("TC-06: Fallback plain-text email address is visible for copy-paste", async ({
    contact,
  }) => {
    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Verify the text 'Ak radšej píšeš e-mail, naša adresa je' is visible", async () => {
      await expect(contact.root.getByText(/Ak radšej píšeš e-mail, naša adresa je/)).toBeVisible();
    });

    await test.step("Verify the <code> element containing 'subenai.podpora@gmail.com' is visible", async () => {
      await expect(contact.emailFallback).toBeVisible();
      await expect(contact.emailFallback).toHaveText("subenai.podpora@gmail.com");
    });
  });

  // TC-07: Operator GDPR inline link points to the correct relative route
  test("TC-07: Operator GDPR inline link points to /privacy and navigates correctly", async ({
    page,
    contact,
    context,
  }) => {
    await test.step("Prime consent and open /contact", async () => {
      await primeConsent(context, "all");
      await contact.open();
    });

    await test.step("Verify the 'Zásadách ochrany súkromia' link has href '/privacy'", async () => {
      await expect(contact.privacyLink).toBeVisible();
      await expect(contact.privacyLink).toHaveAttribute("href", "/privacy");
    });

    await test.step("Click the privacy link and verify it navigates to /privacy without a 404", async () => {
      await contact.privacyLink.click();
      await expect(page).toHaveURL(/\/privacy$/);
    });
  });

  // TC-08: Operator card shows the GDPR contact e-mail as plain text
  test("TC-08: Operator card shows the GDPR contact e-mail as a plain-text code element", async ({
    contact,
  }) => {
    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Verify the GDPR e-mail code in the operator card is visible and not a link", async () => {
      await expect(contact.gdprEmailCode).toBeVisible();
      await expect(contact.gdprEmailCode).toHaveText("subenai.podpora@gmail.com");
      const isInsideAnchor = await contact.gdprEmailCode.evaluate((el) => el.closest("a") !== null);
      expect(isInsideAnchor).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  // TC-09: Page title and meta description are set; robots meta is index, follow
  test("TC-09: Page title, meta description, robots meta, and canonical link are correct", async ({
    page,
    contact,
  }) => {
    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Verify document.title equals 'Kontakt — subenai'", async () => {
      await expect(page).toHaveTitle("Kontakt — subenai");
    });

    await test.step("Verify <meta name='description'> content equals the expected description string", async () => {
      const content = await contact.metaDescriptionContent();
      expect(content).toBe(
        "Napíš nám cez kontaktný formulár. Technická pomoc, GDPR žiadosti, sponzorstvo aj všeobecné otázky. Odpovedáme typicky do 2 pracovných dní.",
      );
    });

    await test.step("Verify <meta name='robots'> content equals 'index, follow' and does not contain 'noindex'", async () => {
      const robots = await contact.robotsContent();
      expect(robots).toBe("index, follow");
      expect(robots).not.toContain("noindex");
    });

    await test.step("Verify <link rel='canonical'> href ends with '/contact'", async () => {
      const href = await contact.canonicalHref();
      expect(href).not.toBeNull();
      expect(href!.endsWith("/contact")).toBe(true);
    });
  });

  // TC-10: Mobile viewport 375×667 — no horizontal overflow
  test("TC-10: Mobile viewport 375×667 renders without horizontal overflow", async ({
    page,
    contact,
  }) => {
    await test.step("Set viewport to 375×667 and open /contact", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await contact.open();
    });

    await test.step("Verify no horizontal overflow", async () => {
      const hasOverflow = await contact.hasHorizontalOverflow();
      expect(hasOverflow).toBe(false);
    });

    await test.step("Verify the primary form CTA is fully visible within the viewport", async () => {
      await expect(contact.mainFormLink).toBeVisible();
    });

    await test.step("Verify the topics list renders in a single column (grid collapses on mobile)", async () => {
      const cols = await contact.topicsGridColumns();
      expect(cols).toBe(1);
    });
  });

  // TC-11: Tablet viewport 768×1024 — topic grid renders in two columns
  test("TC-11: Tablet viewport 768×1024 renders topic grid in two columns", async ({
    page,
    contact,
  }) => {
    await test.step("Set viewport to 768×1024 and open /contact", async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await contact.open();
    });

    await test.step("Verify the topics list is visible", async () => {
      await expect(contact.topicsList).toBeVisible();
    });

    await test.step("Verify the six topic links render in a two-column grid", async () => {
      const cols = await contact.topicsGridColumns();
      expect(cols).toBe(2);
    });
  });

  // TC-12: Links are keyboard-reachable and activatable
  test("TC-12: Form CTA and topic links are keyboard-reachable and activatable", async ({
    page,
    contact,
    context,
  }) => {
    await test.step("Prime consent so focus is not trapped in the consent banner", async () => {
      await primeConsent(context, "all");
    });

    await test.step("Open /contact at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await contact.open();
    });

    await test.step("Tab through the page and verify the primary form CTA receives focus before topic links", async () => {
      let mainFocused = false;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press("Tab");
        const isFocused = await contact.mainFormLink.evaluate(
          (el) => el === document.activeElement,
        );
        if (isFocused) {
          mainFocused = true;
          break;
        }
      }
      expect(mainFocused).toBe(true);
    });

    await test.step("Tab to verify the first topic link (tech) receives focus after the primary CTA", async () => {
      await page.keyboard.press("Tab");
      const isFocused = await contact
        .topicLink("tech")
        .evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
    });

    await test.step("Press Enter on the focused topic link and verify SPA navigation to the form", async () => {
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/contact-form\?topic=tech$/);
    });
  });

  // TC-13: Truthful hero copy — the page no longer claims "no form, no ticket system"
  test("TC-13: Hero copy describes the form honestly (request number + human reply)", async ({
    contact,
  }) => {
    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Verify the hero mentions the request number and a human e-mail reply", async () => {
      await expect(
        contact.root.getByText(/Dostaneš číslo žiadosti a odpoveď e-mailom/),
      ).toBeVisible();
    });

    await test.step("Verify the obsolete 'Žiadny formulár, žiadny ticket systém' claim is gone", async () => {
      await expect(contact.root.getByText(/Žiadny formulár/)).toHaveCount(0);
      await expect(contact.root.getByText(/žiadny ticket systém/)).toHaveCount(0);
    });

    await test.step("Verify no mailto link remains anywhere on the page", async () => {
      const mailtoCount = await contact.root.locator('a[href^="mailto:"]').count();
      expect(mailtoCount).toBe(0);
    });
  });

  // TC-14: Page loads without JavaScript errors in the browser console
  test("TC-14: Page loads without JavaScript errors in the browser console", async ({
    page,
    contact,
    consent,
  }) => {
    const errors: string[] = [];

    await test.step("Attach console error listener before navigation", async () => {
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
    });

    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Dismiss the consent banner via 'Odmietnuť všetko'", async () => {
      if (await consent.isVisible()) {
        await consent.rejectAll();
      }
    });

    await test.step("Verify no console.error entries appear from contact.tsx or its imported modules", async () => {
      const contactErrors = errors.filter((e) => !e.includes("favicon") && !e.includes("net::ERR"));
      expect(contactErrors).toHaveLength(0);
    });
  });

  // TC-15: OG meta tags are present for social sharing
  test("TC-15: OG meta tags are present for social sharing", async ({ contact }) => {
    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Verify og:title equals 'Kontakt — subenai'", async () => {
      const ogTitle = await contact.ogMetaContent("og:title");
      expect(ogTitle).toBe("Kontakt — subenai");
    });

    await test.step("Verify og:type equals 'website'", async () => {
      const ogType = await contact.ogMetaContent("og:type");
      expect(ogType).toBe("website");
    });

    await test.step("Verify og:url equals 'https://subenai.sk/contact'", async () => {
      const ogUrl = await contact.ogMetaContent("og:url");
      expect(ogUrl).toBe("https://subenai.sk/contact");
    });

    await test.step("Verify og:description is non-empty", async () => {
      const ogDesc = await contact.ogMetaContent("og:description");
      expect(ogDesc).not.toBeNull();
      expect(ogDesc!.length).toBeGreaterThan(0);
    });
  });

  // TC-16: Direct navigation via footer "Kontakt" link lands on the correct page
  test("TC-16: Footer 'Kontakt' link navigates to /contact and shows the heading", async ({
    page,
    contact,
    footer,
    context,
  }) => {
    await test.step("Prime consent and open the home page at 1280×800", async () => {
      await primeConsent(context, "all");
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/");
    });

    await test.step("Click the 'Kontakt' link inside the footer 'Projekt' column", async () => {
      await footer.navLink("kontakt").click();
    });

    await test.step("Verify the browser navigated to /contact", async () => {
      await expect(page).toHaveURL(/\/contact$/);
    });

    await test.step("Verify the 'Kontakt' h1 heading is visible", async () => {
      await expect(contact.heading).toBeVisible();
      await expect(contact.heading).toHaveText("Kontakt");
    });
  });

  // TC-17: Rapid successive navigation to /contact does not cause a double-render or console error
  test("TC-17: Rapid successive navigation to /contact does not cause a double-render or console error", async ({
    page,
    contact,
    context,
  }) => {
    const keyWarnings: string[] = [];

    await test.step("Prime consent and attach console listener for React key warnings", async () => {
      await primeConsent(context, "all");
      page.on("console", (msg) => {
        const text = msg.text();
        if ((msg.type() === "warning" || msg.type() === "error") && text.includes("key")) {
          keyWarnings.push(text);
        }
      });
    });

    await test.step("Open the home page", async () => {
      await page.goto("/");
    });

    await test.step("Navigate to /contact, then immediately away and back within 500 ms", async () => {
      await page.goto("/contact");
      await page.goto("/");
      await page.goto("/contact");
    });

    await test.step("Verify the page renders correctly on the second visit", async () => {
      await expect(contact.heading).toBeVisible();
      await expect(contact.heading).toHaveText("Kontakt");
    });

    await test.step("Verify all six topic links are present and have non-empty href values", async () => {
      const hrefs = await contact.allTopicHrefs();
      for (const slug of TOPIC_SLUGS) {
        expect(hrefs[slug]).toBeTruthy();
      }
    });

    await test.step("Verify no React key warning appears in the console", async () => {
      expect(keyWarnings).toHaveLength(0);
    });
  });
});
