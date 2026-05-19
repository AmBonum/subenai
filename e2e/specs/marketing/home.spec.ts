import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

test.describe("Homepage /", () => {
  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  // TC-01: Hero section renders with correct heading and primary CTA
  test("TC-01: Hero section renders with correct heading and primary CTA", async ({
    page,
    marketingHome,
  }) => {
    await test.step("Open the homepage with a clean session at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Verify the h1 heading is visible and contains the correct text", async () => {
      await expect(marketingHome.heroHeading).toBeVisible();
      await expect(marketingHome.heroHeading).toContainText(
        "Otestuj sa skôr, než ťa otestuje podvodník.",
      );
    });

    await test.step("Verify the primary CTA link is visible", async () => {
      await expect(marketingHome.heroCta).toBeVisible();
    });

    await test.step("Verify the tagline beneath the CTA contains all three labels", async () => {
      await expect(marketingHome.heroTagline).toContainText("Bez registrácie");
      await expect(marketingHome.heroTagline).toContainText("90 sekúnd");
      await expect(marketingHome.heroTagline).toContainText("Zadarmo");
    });
  });

  // TC-02: Primary CTA navigates to /test
  test("TC-02: Primary CTA navigates to /test", async ({ page, marketingHome }) => {
    await test.step("Open the homepage at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Click the primary CTA link", async () => {
      await marketingHome.heroCta.click();
    });

    await test.step("Verify the browser navigated to /test", async () => {
      await expect(page).toHaveURL(/\/test$/);
    });
  });

  // TC-03: Feature cards are present and link to correct routes
  test("TC-03: Feature cards are present and link to correct routes", async ({
    page,
    marketingHome,
  }) => {
    await test.step("Open the homepage at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Verify the Sada testov card is visible and links to /tests", async () => {
      await expect(marketingHome.featureCardTesty).toBeVisible();
      await expect(marketingHome.featureCardTesty).toHaveAttribute("href", "/tests");
    });

    await test.step("Verify the Bezplatné školenia card is visible and links to /courses", async () => {
      await expect(marketingHome.featureCardSkolenia).toBeVisible();
      await expect(marketingHome.featureCardSkolenia).toHaveAttribute("href", "/courses");
    });

    await test.step("Verify the O projekte card is visible and links to /about", async () => {
      await expect(marketingHome.featureCardAbout).toBeVisible();
      await expect(marketingHome.featureCardAbout).toHaveAttribute("href", "/about");
    });
  });

  // TC-04: Page title and robots meta are correct
  test("TC-04: Page title and robots meta are correct", async ({ page, marketingHome }) => {
    await test.step("Open the homepage at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Verify document.title equals the expected string", async () => {
      await expect(page).toHaveTitle(
        "subenai — Bezplatný phishing test a kurzy digitálnej bezpečnosti",
      );
    });

    await test.step("Verify robots meta has content 'index, follow, max-image-preview:large'", async () => {
      const robotsContent = await page.evaluate(
        () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
      );
      expect(robotsContent).toBe("index, follow, max-image-preview:large");
    });

    await test.step("Verify description meta is present and non-empty", async () => {
      const descContent = await page.evaluate(
        () => document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
      );
      expect(descContent).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Negative scenarios
  // ---------------------------------------------------------------------------

  // TC-05: Supabase attempt-count query failure degrades gracefully — stats pill shows loading state
  test("TC-05: Supabase count query abort — stats pill shows loading state", async ({
    page,
    marketingHome,
  }) => {
    await test.step("Intercept Supabase attempts query and abort it", async () => {
      await page.route("**/rest/v1/attempts**", (route) => route.abort());
    });

    await test.step("Open the homepage at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Verify the stats pill is visible", async () => {
      await expect(marketingHome.statsPill).toBeVisible();
    });

    await test.step("Verify the pill shows the loading text and does not display a number", async () => {
      await expect(marketingHome.statsPill).toHaveText("Načítavam štatistiky…");
    });

    await test.step("Verify the hero heading is still visible (no error overlay)", async () => {
      await expect(marketingHome.heroHeading).toBeVisible();
    });
  });

  // TC-06: Supabase attempt-count query returns null count — pill displays loading state
  test("TC-06: Supabase count query returns null — pill shows loading state", async ({
    page,
    marketingHome,
  }) => {
    await test.step("Intercept Supabase attempts query and return null count", async () => {
      await page.route("**/rest/v1/attempts**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "access-control-allow-origin": "*",
          },
          body: "[]",
        }),
      );
    });

    await test.step("Open the homepage at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Verify the stats pill shows the loading text", async () => {
      await expect(marketingHome.statsPill).toBeVisible();
      await expect(marketingHome.statsPill).toHaveText("Načítavam štatistiky…");
    });

    await test.step("Verify the hero heading is still visible and unaffected", async () => {
      await expect(marketingHome.heroHeading).toBeVisible();
    });
  });

  // TC-07: Mission block "Podporiť projekt" CTA navigates to /support
  test("TC-07: Mission block 'Podporiť projekt' CTA navigates to /support", async ({
    page,
    marketingHome,
    context,
  }) => {
    await test.step("Prime consent so the banner does not obscure the CTA", async () => {
      await primeConsent(context, "all");
    });

    await test.step("Open the homepage at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Scroll to the mission CTA and click it", async () => {
      await marketingHome.scrollToMission();
      await marketingHome.missionCtaSupport.click();
    });

    await test.step("Verify the browser navigated to /support", async () => {
      await expect(page).toHaveURL(/\/support$/);
    });
  });

  // TC-08: Sponsors section "Pozrieť zoznam" CTA navigates to /sponsors
  test("TC-08: Sponsors section 'Pozrieť zoznam' CTA navigates to /sponsors", async ({
    page,
    marketingHome,
    context,
  }) => {
    await test.step("Prime consent so the banner does not obscure the CTA", async () => {
      await primeConsent(context, "all");
    });

    await test.step("Open the homepage at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Scroll to the sponsors CTA and click it", async () => {
      await marketingHome.scrollToSponsors();
      await marketingHome.sponsorsCta.click();
    });

    await test.step("Verify the browser navigated to /sponsors", async () => {
      await expect(page).toHaveURL(/\/sponsors$/);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  // TC-09: Mobile viewport (375×667) — hero heading and CTA are fully visible without horizontal scroll
  test("TC-09: Mobile viewport 375×667 — hero and CTA visible, no horizontal overflow", async ({
    page,
    marketingHome,
  }) => {
    await test.step("Set mobile viewport (375×667 / iPhone SE) and open the homepage", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await marketingHome.open();
    });

    await test.step("Verify the hero heading is visible within the viewport", async () => {
      await expect(marketingHome.heroHeading).toBeVisible();
    });

    await test.step("Verify the CTA link is visible within the viewport", async () => {
      await expect(marketingHome.heroCta).toBeVisible();
    });

    await test.step("Verify there is no horizontal overflow on the page", async () => {
      const hasOverflow = await marketingHome.hasHorizontalOverflow();
      expect(hasOverflow).toBe(false);
    });
  });

  // TC-10: Tablet viewport (768×1024) — feature cards render in a grid without overflow
  test("TC-10: Tablet viewport 768×1024 — feature cards render without overflow", async ({
    page,
    marketingHome,
  }) => {
    await test.step("Set tablet viewport (768×1024 / iPad portrait) and open the homepage", async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await marketingHome.open();
    });

    await test.step("Verify all three feature cards are visible", async () => {
      await expect(marketingHome.featureCardTesty).toBeVisible();
      await expect(marketingHome.featureCardSkolenia).toBeVisible();
      await expect(marketingHome.featureCardAbout).toBeVisible();
    });

    await test.step("Verify no card overflows the right edge of the viewport (768 px)", async () => {
      const testyBox = await marketingHome.featureCardBoundingBox("testy");
      const skoleniaBox = await marketingHome.featureCardBoundingBox("skolenia");
      const aboutBox = await marketingHome.featureCardBoundingBox("about");

      expect(testyBox).not.toBeNull();
      expect(skoleniaBox).not.toBeNull();
      expect(aboutBox).not.toBeNull();

      if (testyBox) expect(testyBox.x + testyBox.width).toBeLessThanOrEqual(768);
      if (skoleniaBox) expect(skoleniaBox.x + skoleniaBox.width).toBeLessThanOrEqual(768);
      if (aboutBox) expect(aboutBox.x + aboutBox.width).toBeLessThanOrEqual(768);
    });
  });

  // TC-11: Slogan image renders and has a non-empty alt attribute
  test("TC-11: Slogan image is visible with correct alt text and loads successfully", async ({
    page,
    marketingHome,
  }) => {
    await test.step("Open the homepage at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Scroll the slogan image into view and verify it is visible", async () => {
      await marketingHome.sloganImage.scrollIntoViewIfNeeded();
      await expect(marketingHome.sloganImage).toBeVisible();
    });

    await test.step("Verify the alt attribute equals the expected string", async () => {
      await expect(marketingHome.sloganImage).toHaveAttribute(
        "alt",
        "su(rfuj) be(zpečne) na (i)nternete",
      );
    });

    await test.step("Verify the SVG loaded successfully (naturalWidth > 0)", async () => {
      const naturalWidth = await marketingHome.sloganImageNaturalWidth();
      expect(naturalWidth).toBeGreaterThan(0);
    });
  });

  // TC-12: Stats counter displays a formatted Slovak number once the Supabase query resolves
  test("TC-12: Stats counter displays formatted Slovak number from mocked Supabase query", async ({
    page,
    marketingHome,
  }) => {
    await test.step("Intercept Supabase attempts query to return count=500 after 100ms delay", async () => {
      await page.route("**/rest/v1/attempts**", async (route) => {
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "content-range": "*/500",
            "access-control-allow-origin": "*",
            "access-control-expose-headers": "content-range",
          },
          body: "[]",
        });
      });
    });

    await test.step("Open the homepage at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Verify the stats pill shows 'Už otestovaných 627 ľudí' (500 + 127 offset)", async () => {
      await expect(marketingHome.statsPill).toHaveText("Už otestovaných 627 ľudí");
    });

    await test.step("Verify the loading placeholder text is no longer present", async () => {
      await expect(marketingHome.statsPill).not.toHaveText("Načítavam štatistiky…");
    });
  });

  // TC-13: Keyboard-only navigation reaches the primary CTA without a mouse
  test("TC-13: Keyboard-only navigation reaches the primary CTA and navigates to /test", async ({
    page,
    marketingHome,
    context,
  }) => {
    await test.step("Prime consent so focus is not trapped in the consent banner", async () => {
      await primeConsent(context, "all");
    });

    await test.step("Open the homepage at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Tab from the start of the document until focus reaches the hero CTA", async () => {
      await page.keyboard.press("Tab");
      let focused = false;
      for (let i = 0; i < 20; i++) {
        const isFocused = await marketingHome.heroCta.evaluate(
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

    await test.step("Press Enter and verify the browser navigates to /test", async () => {
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/test$/);
    });
  });

  // TC-14: XSS payload injected via URL fragment does not execute on the homepage
  test("TC-14: XSS payload in URL fragment does not execute", async ({ page, marketingHome }) => {
    await test.step("Navigate to the homepage with an XSS payload in the URL fragment", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("http://localhost:8080/#<img src=x onerror=window.__xss=1>", {
        waitUntil: "domcontentloaded",
      });
    });

    await test.step("Verify window.__xss is undefined (payload did not execute)", async () => {
      const xss = await page.evaluate(() => (window as unknown as Record<string, unknown>).__xss);
      expect(xss).toBeUndefined();
    });

    await test.step("Verify the hero heading renders normally", async () => {
      await expect(marketingHome.heroHeading).toBeVisible();
    });
  });

  // TC-15: Site header and footer are present (sanity)
  test("TC-15: Site header and footer are present", async ({
    page,
    marketingHome,
    header,
    footer,
  }) => {
    await test.step("Open the homepage at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await marketingHome.open();
    });

    await test.step("Verify the site header root is visible", async () => {
      await expect(header.root).toBeVisible();
    });

    await test.step("Verify the site footer root is visible", async () => {
      await expect(footer.root).toBeVisible();
    });

    await test.step("Verify the footer 'Spustiť test' nav link resolves to /test", async () => {
      await expect(footer.navLink("test")).toHaveAttribute("href", "/test");
    });
  });
});
