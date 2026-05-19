import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

test.describe("About page /about", () => {
  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  // TC-01: Page renders the heading, tagline, and all seven content sections
  test("TC-01: Page renders the heading, tagline, and all seven content sections", async ({
    page,
    about,
  }) => {
    await test.step("Open /about at 1280×800 with no active session", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await about.open();
    });

    await test.step("Verify the h1 heading 'Čo je subenai' is visible", async () => {
      await expect(about.heading).toBeVisible();
      await expect(about.heading).toHaveText("Čo je subenai");
    });

    await test.step("Verify the tagline 'Bezplatný edukatívny nástroj pre slovenský digitálny svet.' is visible", async () => {
      await expect(about.tagline).toBeVisible();
      await expect(about.tagline).toHaveText(
        "Bezplatný edukatívny nástroj pre slovenský digitálny svet.",
      );
    });

    await test.step("Verify the h2 heading '1. Cieľ projektu' is visible", async () => {
      await expect(about.sectionCiel).toBeVisible();
      await expect(about.sectionCiel.getByRole("heading", { level: 2 })).toHaveText(
        "1. Cieľ projektu",
      );
    });

    await test.step("Verify the h2 heading '2. Prečo bezplatné' is visible", async () => {
      await expect(about.sectionBezplatne.getByRole("heading", { level: 2 })).toHaveText(
        "2. Prečo bezplatné",
      );
    });

    await test.step("Verify the h2 heading '3. Prečo sponsorship a nie členstvo' is visible", async () => {
      await expect(about.sectionSponsorship.getByRole("heading", { level: 2 })).toHaveText(
        "3. Prečo sponsorship a nie členstvo",
      );
    });

    await test.step("Verify the h2 heading '4. Kam idú peniaze' is visible", async () => {
      await expect(about.sectionMoney.getByRole("heading", { level: 2 })).toHaveText(
        "4. Kam idú peniaze",
      );
    });

    await test.step("Verify the h2 heading '5. Čo sponzori dostanú' is visible", async () => {
      await expect(about.sectionSponsors.getByRole("heading", { level: 2 })).toHaveText(
        "5. Čo sponzori dostanú",
      );
    });

    await test.step("Verify the h2 heading '6. Čo nerobíme (a kde je hranica)' is visible", async () => {
      await expect(about.sectionLimits.getByRole("heading", { level: 2 })).toHaveText(
        "6. Čo nerobíme (a kde je hranica)",
      );
    });

    await test.step("Verify the h2 heading 'Chceš projekt podporiť?' is visible", async () => {
      await expect(about.sectionSupport.getByRole("heading", { level: 2 })).toHaveText(
        "Chceš projekt podporiť?",
      );
    });
  });

  // TC-02: CTA buttons link to the correct routes
  test("TC-02: CTA buttons link to the correct routes", async ({ page, about }) => {
    await test.step("Open /about at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await about.open();
    });

    await test.step("Verify the 'Podporiť projekt' link in the support CTA section has href /support", async () => {
      await expect(about.supportCtaPrimary).toBeVisible();
      await expect(about.supportCtaPrimary).toHaveAttribute("href", "/support");
    });

    await test.step("Verify the 'Pozri sponzorov' link in the support CTA section has href /sponsors", async () => {
      await expect(about.supportCtaSecondary).toBeVisible();
      await expect(about.supportCtaSecondary).toHaveAttribute("href", "/sponsors");
    });

    await test.step("Click 'Podporiť projekt' and verify it navigates to /support without a 404", async () => {
      await about.supportCtaPrimary.click();
      await expect(page).toHaveURL(/\/support$/);
    });
  });

  // TC-03: Back-home link and in-text "Nastavenia cookies" link are navigable
  test("TC-03: Back-home link and 'Nastavenia cookies' link are navigable", async ({
    page,
    about,
  }) => {
    await test.step("Open /about at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await about.open();
    });

    await test.step("Click '← Späť na domov' and verify navigation to /", async () => {
      await about.backHomeLink.click();
      await expect(page).toHaveURL(/\/$/);
    });

    await test.step("Verify the home page heading is visible after navigation", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    await test.step("Return to /about", async () => {
      await about.open();
    });

    await test.step("Click 'Nastavenia cookies' inside section 6 and verify navigation to /cookies", async () => {
      await about.cookiesLink.click();
      await expect(page).toHaveURL(/\/cookies$/);
    });
  });

  // ---------------------------------------------------------------------------
  // Negative scenarios
  // ---------------------------------------------------------------------------

  // TC-04: Direct navigation to /about with no session returns 200, not a redirect
  test("TC-04: Direct navigation to /about with no session returns 200, not a redirect", async ({
    page,
    about,
  }) => {
    await test.step("Navigate directly to /about with no sb-*-auth-token cookie and no localStorage session", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await about.open();
    });

    await test.step("Verify the page renders the 'Čo je subenai' heading without redirecting", async () => {
      await expect(about.heading).toBeVisible();
      await expect(about.heading).toHaveText("Čo je subenai");
      await expect(page).toHaveURL(/\/about$/);
    });
  });

  // TC-05: Page title tag is set correctly
  test("TC-05: Page title tag is set correctly", async ({ page, about }) => {
    await test.step("Open /about", async () => {
      await about.open();
    });

    await test.step("Verify document.title equals 'O projekte — subenai'", async () => {
      await expect(page).toHaveTitle("O projekte — subenai");
    });

    await test.step("Verify robots meta content is 'index, follow' and does not contain 'noindex'", async () => {
      const content = await about.robotsContent();
      expect(content).toBe("index, follow");
      expect(content).not.toContain("noindex");
    });
  });

  // TC-06: Canonical link points to the production origin
  test("TC-06: Canonical link points to the production origin", async ({ about }) => {
    await test.step("Open /about", async () => {
      await about.open();
    });

    await test.step("Verify <link rel='canonical'> has href 'https://subenai.sk/about'", async () => {
      const href = await about.canonicalHref();
      expect(href).toBe("https://subenai.sk/about");
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  // TC-07: All seven section aria-labelledby IDs are present and match their headings
  test("TC-07: All seven section aria-labelledby IDs are present and match their headings", async ({
    about,
  }) => {
    await test.step("Open /about", async () => {
      await about.open();
    });

    await test.step("Verify id='ciel' heading text equals '1. Cieľ projektu'", async () => {
      const text = await about.sectionHeadingText("ciel");
      expect(text).toBe("1. Cieľ projektu");
    });

    await test.step("Verify id='bezplatne' heading text equals '2. Prečo bezplatné'", async () => {
      const text = await about.sectionHeadingText("bezplatne");
      expect(text).toBe("2. Prečo bezplatné");
    });

    await test.step("Verify id='preco-sponsorship' heading text equals '3. Prečo sponsorship a nie členstvo'", async () => {
      const text = await about.sectionHeadingText("preco-sponsorship");
      expect(text).toBe("3. Prečo sponsorship a nie členstvo");
    });

    await test.step("Verify id='kam-id-peniaze' heading text equals '4. Kam idú peniaze'", async () => {
      const text = await about.sectionHeadingText("kam-id-peniaze");
      expect(text).toBe("4. Kam idú peniaze");
    });

    await test.step("Verify id='co-sponzori' heading text equals '5. Čo sponzori dostanú'", async () => {
      const text = await about.sectionHeadingText("co-sponzori");
      expect(text).toBe("5. Čo sponzori dostanú");
    });

    await test.step("Verify id='co-nerobime' heading text equals '6. Čo nerobíme (a kde je hranica)'", async () => {
      const text = await about.sectionHeadingText("co-nerobime");
      expect(text).toBe("6. Čo nerobíme (a kde je hranica)");
    });

    await test.step("Verify id='podporit' heading text equals 'Chceš projekt podporiť?'", async () => {
      const text = await about.sectionHeadingText("podporit");
      expect(text).toBe("Chceš projekt podporiť?");
    });
  });

  // TC-08: Mobile viewport (375×667) renders without horizontal overflow
  test("TC-08: Mobile viewport 375×667 renders without horizontal overflow", async ({
    page,
    about,
  }) => {
    await test.step("Set mobile viewport 375×667 and open /about", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await about.open();
    });

    await test.step("Verify there is no horizontal overflow", async () => {
      const hasOverflow = await about.hasHorizontalOverflow();
      expect(hasOverflow).toBe(false);
    });

    await test.step("Verify the 'Čo je subenai' heading is visible", async () => {
      await expect(about.heading).toBeVisible();
    });

    await test.step("Verify both CTA links are visible and not cut off", async () => {
      await expect(about.supportCtaPrimary).toBeVisible();
      await expect(about.supportCtaSecondary).toBeVisible();
    });
  });

  // TC-09: The about.tsx component now contains the required data-testid attributes
  test("TC-09: The about.tsx component contains the required data-testid attributes", async ({
    page,
    about,
  }) => {
    await test.step("Open /about", async () => {
      await about.open();
    });

    await test.step("Verify data-testid='about-heading', 'about-back-home', 'about-support-cta-primary', and 'about-support-cta-secondary' are present in the DOM", async () => {
      const aboutTestIds = await page.evaluate(() =>
        Array.from(document.querySelectorAll("[data-testid]"))
          .map((el) => el.getAttribute("data-testid"))
          .filter((id) => id?.startsWith("about-")),
      );
      expect(aboutTestIds).toContain("about-heading");
      expect(aboutTestIds).toContain("about-back-home");
      expect(aboutTestIds).toContain("about-support-cta-primary");
      expect(aboutTestIds).toContain("about-support-cta-secondary");
    });
  });

  // TC-10: Keyboard-only navigation reaches both CTA links in the support section
  test("TC-10: Keyboard-only navigation reaches both CTA links in the support section", async ({
    page,
    about,
    context,
  }) => {
    await test.step("Prime consent so focus is not trapped in the consent banner", async () => {
      await primeConsent(context, "all");
    });

    await test.step("Open /about at 1280×800 without any pointer interaction", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await about.open();
    });

    await test.step("Tab until focus reaches the 'Podporiť projekt' link in the support section", async () => {
      let focused = false;
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press("Tab");
        const isFocused = await about.supportCtaPrimary.evaluate(
          (el) => el === document.activeElement,
        );
        if (isFocused) {
          focused = true;
          break;
        }
      }
      expect(focused).toBe(true);
    });

    await test.step("Press Tab once more and verify focus moves to 'Pozri sponzorov'", async () => {
      await page.keyboard.press("Tab");
      const isFocused = await about.supportCtaSecondary.evaluate(
        (el) => el === document.activeElement,
      );
      expect(isFocused).toBe(true);
    });
  });

  // TC-11: JSON-LD AboutPage script is present and valid
  test("TC-11: JSON-LD AboutPage script is present and valid", async ({ about }) => {
    await test.step("Open /about", async () => {
      await about.open();
    });

    await test.step("Verify a script[type='application/ld+json'] with '@type': 'AboutPage' exists and parses as valid JSON", async () => {
      const node = await about.aboutPageJsonLd();
      expect(node).not.toBeNull();
      expect(node?.["@type"]).toBe("AboutPage");
    });
  });

  // TC-12: Page renders correctly when the browser locale is non-Slovak (en-US)
  test("TC-12: Page renders correctly when browser locale is en-US", async ({ page, about }) => {
    await test.step("Navigate to /about with Accept-Language: en-US and verify Slovak content is still rendered", async () => {
      await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
      await about.open();
    });

    await test.step("Verify the 'Čo je subenai' heading is present (no language negotiation occurs)", async () => {
      await expect(about.heading).toBeVisible();
      await expect(about.heading).toHaveText("Čo je subenai");
    });

    await test.step("Verify no JavaScript console errors related to Intl or localeCompare", async () => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          if (text.includes("Intl") || text.includes("localeCompare")) {
            errors.push(text);
          }
        }
      });
      // Re-open to capture any console errors triggered on load
      await about.open();
      expect(errors).toHaveLength(0);
    });
  });

  // TC-13: Analytics consent is denied before the user interacts with the consent banner
  //
  // The app uses Google Consent Mode v2: GTM loads on all pages (including pre-consent)
  // but marks analytics_storage and ad_storage as "denied". GA4 collects only cookieless
  // pings (npa=1, gcs=G100) and does not associate them with any user identity.
  // The privacy invariant is therefore NOT "GTM doesn't load" but "analytics_storage
  // and ad_storage are denied in the dataLayer before any consent interaction".
  test("TC-13: Analytics consent is denied in the dataLayer before consent is given", async ({
    page,
    about,
    consent,
  }) => {
    await test.step("Open /about in a fresh context with no cookies or localStorage (consent not given)", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await about.open();
    });

    await test.step("Verify the dataLayer consent default sets analytics_storage and ad_storage to 'denied'", async () => {
      const consentDefaults = await page.evaluate(() => {
        const dl = window.dataLayer as Array<Record<string, unknown>> | undefined;
        if (!dl) return null;
        for (const entry of dl) {
          // GTM pushes consent commands as array-like objects with numeric string keys:
          // { "0": "consent", "1": "default", "2": { analytics_storage: "denied", … } }
          if (
            entry["0"] === "consent" &&
            entry["1"] === "default" &&
            typeof entry["2"] === "object" &&
            entry["2"] !== null
          ) {
            return entry["2"] as Record<string, string>;
          }
        }
        return null;
      });
      expect(consentDefaults).not.toBeNull();
      expect(consentDefaults?.["analytics_storage"]).toBe("denied");
      expect(consentDefaults?.["ad_storage"]).toBe("denied");
      expect(consentDefaults?.["ad_user_data"]).toBe("denied");
      expect(consentDefaults?.["ad_personalization"]).toBe("denied");
    });

    await test.step("Verify no analytics_storage consent has been granted (no iiq_consent in localStorage)", async () => {
      const stored = await page.evaluate(() => localStorage.getItem("iiq_consent"));
      expect(stored).toBeNull();
    });

    await test.step("Verify the consent banner is visible", async () => {
      await expect(consent.root).toBeVisible();
    });
  });
});
