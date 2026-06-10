import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

test.describe("Contact page /contact", () => {
  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  // TC-01: Page renders with correct title, heading, and all mailto links visible
  test("TC-01: Page renders with correct title, heading, and all mailto links visible", async ({
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

    await test.step("Verify the primary email link 'Napísať na subenai.podpora@gmail.com' is visible", async () => {
      await expect(contact.mainEmailLink).toBeVisible();
    });

    await test.step("Verify all six topic links are visible in the topics list", async () => {
      await expect(contact.topicsList).toBeVisible();
      await expect(contact.topicLink("tech")).toBeVisible();
      await expect(contact.topicLink("content")).toBeVisible();
      await expect(contact.topicLink("sponsor")).toBeVisible();
      await expect(contact.topicLink("gdpr")).toBeVisible();
      await expect(contact.topicLink("press")).toBeVisible();
      await expect(contact.topicLink("other")).toBeVisible();
    });

    await test.step("Verify the operator card with heading 'Prevádzkovateľ' is visible", async () => {
      await expect(contact.operatorCard).toBeVisible();
      await expect(contact.operatorCard.getByRole("heading", { level: 2 })).toHaveText(
        "Prevádzkovateľ",
      );
    });
  });

  // TC-02: Primary mailto link carries the correct pre-filled subject
  test("TC-02: Primary mailto link carries the correct pre-filled subject", async ({ contact }) => {
    await test.step("Open /contact at 1280×800", async () => {
      await contact.open();
    });

    await test.step("Verify the href starts with 'mailto:subenai.podpora@gmail.com?' and decoded subject is 'subenai — Kontakt'", async () => {
      const href = await contact.mainEmailLink.getAttribute("href");
      expect(href).not.toBeNull();
      expect(href!).toMatch(/^mailto:subenai\.podpora@gmail\.com\?/);
      const subject = contact.decodeMailtoSubject(href!);
      expect(subject).toBe("subenai — Kontakt");
    });
  });

  // TC-03: Topic link "GDPR žiadosť" generates a mailto with the correct subject
  test("TC-03: Topic link 'GDPR žiadosť' generates a mailto with the correct subject", async ({
    contact,
  }) => {
    await test.step("Open /contact at 1280×800", async () => {
      await contact.open();
    });

    await test.step("Verify the GDPR topic link href points to 'subenai.podpora@gmail.com' and decoded subject is 'subenai — GDPR žiadosť'", async () => {
      const href = await contact.topicLink("gdpr").getAttribute("href");
      expect(href).not.toBeNull();
      expect(href!).toMatch(/^mailto:subenai\.podpora@gmail\.com\?/);
      const subject = contact.decodeMailtoSubject(href!);
      expect(subject).toBe("subenai — GDPR žiadosť");
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

  // ---------------------------------------------------------------------------
  // Negative scenarios
  // ---------------------------------------------------------------------------

  // TC-05: All six topic mailto hrefs decode to a non-empty unique `subject` parameter
  test("TC-05: All six topic mailto hrefs decode to a non-empty and unique subject parameter", async ({
    contact,
  }) => {
    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Read all six topic link hrefs and verify each decoded subject is non-empty and starts with 'subenai — '", async () => {
      const subjects = await contact.allTopicSubjects();
      expect(subjects).toHaveLength(6);
      for (const subject of subjects) {
        expect(subject.length).toBeGreaterThan(0);
        expect(subject.startsWith("subenai — ")).toBe(true);
      }
    });

    await test.step("Verify all six subjects are distinct (no two subjects are the same)", async () => {
      const subjects = await contact.allTopicSubjects();
      const unique = new Set(subjects);
      expect(unique.size).toBe(6);
    });
  });

  // TC-06: Fallback plain-text email address is visible for copy-paste
  test("TC-06: Fallback plain-text email address is visible for copy-paste", async ({
    contact,
  }) => {
    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Verify the text 'Ak ti tlačidlo nefunguje, skopíruj adresu ručne:' is visible", async () => {
      await expect(
        contact.root.getByText(/Ak ti tlačidlo nefunguje, skopíruj adresu ručne:/),
      ).toBeVisible();
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

  // TC-08: Operator GDPR mailto link in the card carries the GDPR subject
  test("TC-08: Operator GDPR mailto link carries the GDPR subject", async ({ contact }) => {
    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Verify the GDPR mailto link in the operator card has decoded subject 'subenai — GDPR žiadosť'", async () => {
      const href = await contact.gdprEmailLink.getAttribute("href");
      expect(href).not.toBeNull();
      const subject = contact.decodeMailtoSubject(href!);
      expect(subject).toBe("subenai — GDPR žiadosť");
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  // TC-09: Page title and meta description are set; `robots` meta is `index, follow`
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
        "Napíš nám priamo na email. Technická pomoc, GDPR žiadosti, sponzorstvo aj všeobecné otázky. Odpovedáme typicky do 2 pracovných dní.",
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

    await test.step("Verify the primary mailto button is fully visible within the viewport", async () => {
      await expect(contact.mainEmailLink).toBeVisible();
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

  // TC-12: All mailto links are keyboard-reachable and activatable
  test("TC-12: All mailto links are keyboard-reachable and activatable", async ({
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

    await test.step("Tab through the page and verify the primary mailto link receives focus before topic links", async () => {
      let mainFocused = false;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press("Tab");
        const isFocused = await contact.mainEmailLink.evaluate(
          (el) => el === document.activeElement,
        );
        if (isFocused) {
          mainFocused = true;
          break;
        }
      }
      expect(mainFocused).toBe(true);
    });

    await test.step("Tab to verify the first topic link (tech) receives focus after the primary link", async () => {
      await page.keyboard.press("Tab");
      const isFocused = await contact
        .topicLink("tech")
        .evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
    });

    await test.step("Verify pressing Enter on a focused mailto link does not throw a JavaScript error", async () => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      await page.keyboard.press("Enter");
      expect(errors).toHaveLength(0);
    });
  });

  // TC-13: Slovak diacritics in subject lines encode correctly in the href
  test("TC-13: Slovak diacritics in subject lines encode correctly and round-trip via decodeURIComponent", async ({
    contact,
  }) => {
    await test.step("Open /contact", async () => {
      await contact.open();
    });

    await test.step("Read the raw href of the GDPR topic link and verify it contains percent-encoded characters", async () => {
      const href = await contact.topicLink("gdpr").getAttribute("href");
      expect(href).not.toBeNull();
      const qmark = href!.indexOf("?");
      const rawQuery = href!.slice(qmark + 1);
      expect(rawQuery).toMatch(/%[0-9A-Fa-f]{2}/);
    });

    await test.step("Verify decodeURIComponent of the subject value round-trips back to 'subenai — GDPR žiadosť' without data loss", async () => {
      const href = await contact.topicLink("gdpr").getAttribute("href");
      const subject = contact.decodeMailtoSubject(href!);
      expect(subject).toBe("subenai — GDPR žiadosť");
      expect(subject!.startsWith("subenai — ")).toBe(true);
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
      const slugs = ["tech", "content", "sponsor", "gdpr", "press", "other"] as const;
      for (const slug of slugs) {
        const href = await contact.topicLink(slug).getAttribute("href");
        expect(href).not.toBeNull();
        expect(href!.length).toBeGreaterThan(0);
      }
    });

    await test.step("Verify no React key warning appears in the console", async () => {
      expect(keyWarnings).toHaveLength(0);
    });
  });
});
