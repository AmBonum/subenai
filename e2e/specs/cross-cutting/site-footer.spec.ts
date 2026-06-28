// spec: specs/cross-cutting/site-footer.md

import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { stubFooterSponsors } from "../../mocks/api/footer-sponsors";

test.describe("Site footer", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  test.describe("Happy paths", () => {
    test("TC-01: Brand block renders the logo link, tagline and version link", async ({
      page,
      footer,
    }) => {
      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the logo link has aria-label, href=/ and wraps an img with alt=subenai", async () => {
        await expect(footer.logoLink).toHaveAttribute("aria-label", "subenai — domov");
        await expect(footer.logoLink).toHaveAttribute("href", "/");
        await expect(footer.logoImg).toHaveAttribute("alt", "subenai");
        await expect(footer.logoImg).toBeVisible();
      });

      await test.step("Verify the tagline paragraph is visible", async () => {
        await expect(footer.tagline).toContainText(
          "Bezplatný edukatívny nástroj pre slovenský digitálny svet.",
        );
      });

      await test.step("Verify the version link has the correct aria-label and href=/changelog", async () => {
        await expect(footer.versionLink).toHaveAttribute(
          "aria-label",
          /^Aktuálna verzia v[0-9]+\.[0-9]+\.[0-9]+ — zoznam zmien$/,
        );
        await expect(footer.versionLink).toHaveAttribute("href", "/changelog");
        await expect(footer.versionLink).toContainText(/^v[0-9]+\.[0-9]+\.[0-9]+$/);
      });
    });

    test("TC-02: Clicking the version link routes to /changelog", async ({ page, footer }) => {
      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Click the version link and verify the URL changes to /changelog", async () => {
        await footer.versionLink.click();
        await expect(page).toHaveURL(/\/changelog$/);
      });

      await test.step("Verify the footer remains rendered on /changelog", async () => {
        await expect(footer.root).toBeVisible();
      });
    });

    test("TC-03: All three navigation columns render the correct headings and link targets", async ({
      page,
      footer,
    }) => {
      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the Obsah column heading and its four links", async () => {
        await expect(footer.columnObsahHeading).toHaveText("Obsah");
        await expect(footer.navLink("test")).toHaveText("Spustiť test");
        await expect(footer.navLink("test")).toHaveAttribute("href", "/test");
        await expect(footer.navLink("testy")).toHaveText("Sady testov");
        await expect(footer.navLink("testy")).toHaveAttribute("href", "/tests");
        await expect(footer.navLink("academy")).toHaveText("Akadémia");
        await expect(footer.navLink("academy")).toHaveAttribute("href", "/academy");
        await expect(footer.navLink("skoly")).toHaveText("Pre školy");
        await expect(footer.navLink("skoly")).toHaveAttribute("href", "/schools");
      });

      await test.step("Verify the Projekt column heading and its five links", async () => {
        await expect(footer.columnProjektHeading).toHaveText("Projekt");
        await expect(footer.navLink("o-projekte")).toHaveText("O projekte");
        await expect(footer.navLink("o-projekte")).toHaveAttribute("href", "/about");
        await expect(footer.navLink("kontakt")).toHaveText("Kontakt");
        await expect(footer.navLink("kontakt")).toHaveAttribute("href", "/contact");
        await expect(footer.navLink("podpora")).toHaveText("Podpora projektu");
        await expect(footer.navLink("podpora")).toHaveAttribute("href", "/support");
        await expect(footer.navLink("sponzori")).toHaveText("Sponzori");
        await expect(footer.navLink("sponzori")).toHaveAttribute("href", "/sponsors");
        await expect(footer.navLink("zmeny")).toHaveText("Zmeny a verzie");
        await expect(footer.navLink("zmeny")).toHaveAttribute("href", "/changelog");
      });

      await test.step("Verify the Právne column heading and its three links", async () => {
        await expect(footer.columnPravneHeading).toHaveText("Právne");
        await expect(footer.navLink("privacy")).toHaveText("Súkromie");
        await expect(footer.navLink("privacy")).toHaveAttribute("href", "/privacy");
        await expect(footer.navLink("cookies")).toHaveText("Cookies");
        await expect(footer.navLink("cookies")).toHaveAttribute("href", "/cookies");
        await expect(footer.navLink("spravovat-podporu")).toHaveText(
          "Spravovať podporu (sponzori)",
        );
        await expect(footer.navLink("spravovat-podporu")).toHaveAttribute(
          "href",
          "/manage-support",
        );
      });
    });

    test("TC-04: Bottom bar shows the copyright paragraph and the cookies-settings button", async ({
      page,
      footer,
      consent,
    }) => {
      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the copyright paragraph contains the current year", async () => {
        const year = new Date().getFullYear().toString();
        await expect(footer.copyright).toContainText(`© ${year} subenai · Všetky práva vyhradené.`);
      });

      await test.step("Verify the cookies button is present with type=button", async () => {
        await expect(footer.cookiesButton).toBeVisible();
        await expect(footer.cookiesButton).toHaveText("Nastavenia cookies");
        await expect(footer.cookiesButton).toHaveAttribute("type", "button");
      });

      await test.step("Click the cookies button and verify the consent preferences dialog opens", async () => {
        await footer.cookiesButton.click();
        await expect(consent.preferencesDialog).toBeVisible();
      });
    });

    test("TC-05: External attribution links carry target=_blank + rel=noopener noreferrer", async ({
      page,
      footer,
    }) => {
      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the Novejši link attributes", async () => {
        await expect(footer.novejsiLink).toHaveAttribute(
          "href",
          "https://www.youtube.com/watch?v=dbuCSt_k5c8",
        );
        await expect(footer.novejsiLink).toHaveAttribute("target", "_blank");
        await expect(footer.novejsiLink).toHaveAttribute("rel", "noopener noreferrer");
      });

      await test.step("Verify the lvtesting.eu link attributes", async () => {
        await expect(footer.lvtestingLink).toHaveAttribute("href", "https://www.lvtesting.eu");
        await expect(footer.lvtestingLink).toHaveAttribute("target", "_blank");
        await expect(footer.lvtestingLink).toHaveAttribute("rel", "noopener noreferrer");
      });
    });

    test("TC-06: Footer renders identically on a nested route (/courses)", async ({
      page,
      footer,
    }) => {
      await test.step("Set desktop viewport (1280×800) and open /courses", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/academy");
      });

      await test.step("Verify the brand block is rendered", async () => {
        await expect(footer.logoLink).toBeVisible();
        await expect(footer.tagline).toBeVisible();
        await expect(footer.versionLink).toBeVisible();
      });

      await test.step("Verify all three nav columns are rendered", async () => {
        await expect(footer.columnObsah).toBeVisible();
        await expect(footer.columnProjekt).toBeVisible();
        await expect(footer.columnPravne).toBeVisible();
      });

      await test.step("Verify the bottom bar and cookies button are rendered", async () => {
        await expect(footer.copyright).toBeVisible();
        await expect(footer.cookiesButton).toBeVisible();
      });

      await test.step("Verify nav link targets match TC-03 assertions on /courses", async () => {
        await expect(footer.navLink("test")).toHaveAttribute("href", "/test");
        await expect(footer.navLink("testy")).toHaveAttribute("href", "/tests");
        await expect(footer.navLink("o-projekte")).toHaveAttribute("href", "/about");
        await expect(footer.navLink("privacy")).toHaveAttribute("href", "/privacy");
      });
    });

    test("TC-07: Internal footer links navigate via TanStack Router (no full page reload)", async ({
      page,
      footer,
    }) => {
      let loadFired = false;

      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Attach a load listener to detect full page reload", async () => {
        page.on("load", () => {
          loadFired = true;
        });
        loadFired = false;
      });

      await test.step("Click the Sady testov link in the Obsah column", async () => {
        await footer.navLink("testy").click();
        await expect(page).toHaveURL(/\/tests$/);
      });

      await test.step("Verify no full-page load event fired (client-side navigation)", async () => {
        expect(loadFired).toBe(false);
      });

      await test.step("Verify the footer on /tests renders with its links intact", async () => {
        await expect(footer.root).toBeVisible();
        await expect(footer.navLink("testy")).toBeVisible();
      });

      await test.step("Press the browser back button and verify return to / without reload", async () => {
        loadFired = false;
        await page.goBack();
        await expect(page).toHaveURL(/\/$/);
        expect(loadFired).toBe(false);
      });
    });

    test("TC-08: Sponsor strip is hidden when footer_sponsors returns an empty list", async ({
      page,
      footer,
    }) => {
      await test.step("Mock footer_sponsors to return an empty array", async () => {
        await stubFooterSponsors(page, { status: 200, rows: [] });
      });

      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the sponsor strip element is not rendered", async () => {
        await expect(footer.sponsorStrip).not.toBeAttached();
        await expect(footer.sponsorStripHeading).not.toBeAttached();
      });

      await test.step("Verify the rest of the footer is unaffected", async () => {
        await expect(footer.logoLink).toBeVisible();
        await expect(footer.columnObsah).toBeVisible();
        await expect(footer.copyright).toBeVisible();
      });
    });

    test("TC-09: Sponsor strip renders names + links when footer_sponsors returns rows", async ({
      page,
      footer,
    }) => {
      await test.step("Mock footer_sponsors with two rows (one with link, one without)", async () => {
        await stubFooterSponsors(page, {
          status: 200,
          rows: [
            { id: "a", display_name: "Acme Corp", display_link: "https://acme.example" },
            { id: "b", display_name: "Plain Donor", display_link: null },
          ],
        });
      });

      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the sponsor strip heading is visible", async () => {
        await expect(footer.sponsorStripHeading).toHaveText("Vďaka top sponzorom");
      });

      await test.step("Verify Acme Corp renders as an anchor link with target=_blank and ↗ glyph", async () => {
        await expect(footer.sponsorLink("a")).toBeVisible();
        await expect(footer.sponsorLink("a")).toHaveAttribute("href", "https://acme.example");
        await expect(footer.sponsorLink("a")).toHaveAttribute("target", "_blank");
        await expect(footer.sponsorLink("a")).toHaveAttribute("rel", "noopener noreferrer");
        await expect(footer.sponsorLinkArrow("a")).toHaveText("↗");
      });

      await test.step("Verify Plain Donor renders as a span (not an anchor) with no href", async () => {
        await expect(footer.sponsorLink("b")).toBeVisible();
        await expect(footer.sponsorLink("b")).toContainText("Plain Donor");
        expect(await footer.sponsorTagName("b")).toBe("span");
        await expect(footer.sponsorLink("b")).not.toHaveAttribute("href");
      });

      await test.step("Verify the všetci sponzori link points to /sponsors", async () => {
        await expect(footer.sponsorAllLink).toBeVisible();
        await expect(footer.sponsorAllLink).toHaveText("všetci sponzori →");
        await expect(footer.sponsorAllLink).toHaveAttribute("href", "/sponsors");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Negative scenarios
  // ---------------------------------------------------------------------------

  test.describe("Negative scenarios", () => {
    test("TC-10: Footer renders on the 404 page (root-level footer mount)", async ({
      page,
      footer,
      notFound,
    }) => {
      await test.step("Set desktop viewport (1280×800) and open an unknown route", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/this-route-does-not-exist");
      });

      await test.step("Verify the 404 view renders with both headings", async () => {
        await expect(notFound.heading).toBeVisible();
        await expect(notFound.subheading).toBeVisible();
      });

      await test.step("Verify the footer is present (root layout renders it on every non-opted-out route)", async () => {
        await expect(footer.root).toBeVisible();
      });
    });

    test("TC-11: Supabase 500 on the sponsor fetch degrades gracefully", async ({
      page,
      footer,
    }) => {
      const pageErrors: string[] = [];

      await test.step("Attach pageerror listener and mock footer_sponsors to return HTTP 500", async () => {
        page.on("pageerror", (err) => pageErrors.push(err.message));
        await stubFooterSponsors(page, { status: 500 });
      });

      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the sponsor strip is not rendered", async () => {
        await expect(footer.sponsorStrip).not.toBeAttached();
      });

      await test.step("Verify the rest of the footer renders without error", async () => {
        await expect(footer.logoLink).toBeVisible();
        await expect(footer.columnObsah).toBeVisible();
        await expect(footer.copyright).toBeVisible();
        await expect(footer.cookiesButton).toBeVisible();
      });

      await test.step("Verify no unhandled promise rejection appeared in the browser", async () => {
        expect(pageErrors).toHaveLength(0);
      });
    });

    test("TC-12: Network abort (ad-blocker pattern) on the sponsor fetch degrades gracefully", async ({
      page,
      footer,
    }) => {
      const pageErrors: string[] = [];

      await test.step("Attach pageerror listener and mock footer_sponsors to abort", async () => {
        page.on("pageerror", (err) => pageErrors.push(err.message));
        await stubFooterSponsors(page, { abort: true });
      });

      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the sponsor strip is not rendered", async () => {
        await expect(footer.sponsorStrip).not.toBeAttached();
      });

      await test.step("Verify the rest of the footer renders without error", async () => {
        await expect(footer.logoLink).toBeVisible();
        await expect(footer.columnObsah).toBeVisible();
        await expect(footer.copyright).toBeVisible();
      });

      await test.step("Verify no unhandled rejection appeared in the browser console", async () => {
        expect(pageErrors).toHaveLength(0);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test.describe("Edge cases", () => {
    test("TC-13: Mobile viewport (375×667) — single-column stack, no horizontal overflow", async ({
      page,
      footer,
    }) => {
      await test.step("Set mobile viewport (375×667) and open the home page", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
      });

      await test.step("Verify the grid stacks into a single column", async () => {
        expect(await footer.gridColumnCount()).toBe(1);
      });

      await test.step("Verify the bottom bar stacks vertically (copyright above button)", async () => {
        const copyrightBox = await footer.copyright.boundingBox();
        const buttonBox = await footer.cookiesButton.boundingBox();
        expect(copyrightBox!.y).toBeLessThan(buttonBox!.y);
      });

      await test.step("Verify document.documentElement.scrollWidth ≤ 375", async () => {
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(375);
      });
    });

    test("TC-14: Tablet viewport (768×1024) — two-column grid kicks in", async ({
      page,
      footer,
    }) => {
      await test.step("Set tablet viewport (768×1024) and open the home page", async () => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto("/");
      });

      await test.step("Verify the grid is four-column (md:grid-cols-4 activates at ≥ 768 px)", async () => {
        expect(await footer.gridColumnCount()).toBe(4);
      });

      await test.step("Verify document.documentElement.scrollWidth ≤ 768", async () => {
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(768);
      });

      await test.step("Verify text alignment inside the footer is text-left", async () => {
        expect(await footer.gridTextAlign()).toBe("left");
      });
    });

    test("TC-15: Desktop viewport (1280×800) — four-column row centered within max-w-5xl", async ({
      page,
      footer,
    }) => {
      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the footer bounding box width is ≤ 1024 px (max-w-5xl)", async () => {
        const box = await footer.rootBoundingBox();
        expect(box!.width).toBeLessThanOrEqual(1024);
      });

      await test.step("Verify the footer is horizontally centered (equal margins on left and right)", async () => {
        const box = await footer.rootBoundingBox();
        const leftMargin = box!.x;
        const rightMargin = 1280 - (box!.x + box!.width);
        expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(2);
      });

      await test.step("Verify document.documentElement.scrollWidth ≤ 1280", async () => {
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(1280);
      });
    });

    test("TC-16: Keyboard tab order through the footer's interactive elements", async ({
      page,
      footer,
      consent,
    }) => {
      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Programmatically focus the footer logo link", async () => {
        await footer.logoLink.focus();
      });

      await test.step("Verify footer logo is focused", async () => {
        await expect(footer.logoLink).toBeFocused();
      });

      await test.step("Tab to Novejši external link", async () => {
        await page.keyboard.press("Tab");
        await expect(footer.novejsiLink).toBeFocused();
      });

      await test.step("Tab to version link", async () => {
        await page.keyboard.press("Tab");
        await expect(footer.versionLink).toBeFocused();
      });

      await test.step("Tab through nav links: Spustiť test → Sady testov → Akadémia → Šablóny testov → Pre školy", async () => {
        await page.keyboard.press("Tab");
        await expect(footer.navLink("test")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(footer.navLink("testy")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(footer.navLink("academy")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(footer.navLink("sablony")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(footer.navLink("skoly")).toBeFocused();
      });

      await test.step("Tab through Projekt column links", async () => {
        await page.keyboard.press("Tab");
        await expect(footer.navLink("o-projekte")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(footer.navLink("kontakt")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(footer.navLink("podpora")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(footer.navLink("sponzori")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(footer.navLink("zmeny")).toBeFocused();
      });

      await test.step("Tab through Právne column links", async () => {
        await page.keyboard.press("Tab");
        await expect(footer.navLink("privacy")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(footer.navLink("cookies")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(footer.navLink("spravovat-podporu")).toBeFocused();
      });

      await test.step("Tab to Nastavenia cookies button", async () => {
        await page.keyboard.press("Tab");
        await expect(footer.cookiesButton).toBeFocused();
      });

      await test.step("Press Enter while cookies button is focused and verify the preferences dialog opens", async () => {
        await page.keyboard.press("Enter");
        await expect(consent.preferencesDialog).toBeVisible();
      });
    });

    test("TC-17: Footer logo carries aria-label=subenai — domov AND non-empty img alt", async ({
      page,
      footer,
    }) => {
      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the logo link has aria-label and href=/", async () => {
        await expect(footer.logoLink).toHaveAttribute("aria-label", "subenai — domov");
        await expect(footer.logoLink).toHaveAttribute("href", "/");
      });

      await test.step("Verify the inner img has alt=subenai (non-empty)", async () => {
        await expect(footer.logoImg).toHaveAttribute("alt", "subenai");
      });
    });

    test("TC-18: <footer> sits outside <main> and exposes the contentinfo landmark", async ({
      page,
      footer,
    }) => {
      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the footer element is NOT a descendant of main (rendered at the root layout level)", async () => {
        expect(await footer.isInsideMain()).toBe(false);
      });

      await test.step("Verify exactly one contentinfo landmark is exposed (top-level footer keeps its implicit role)", async () => {
        await expect(footer.contentInfoLandmark).toHaveCount(1);
      });
    });

    test("TC-19: Sponsor fetch is shared across two footer mounts (module-level promise cache)", async ({
      page,
      header,
      footer,
    }) => {
      const sponsorRequests: string[] = [];

      await test.step("Set desktop viewport (1280×800) and attach a request recorder", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        page.on("request", (req) => {
          if (req.url().includes("/rest/v1/footer_sponsors")) {
            sponsorRequests.push(req.url());
          }
        });
      });

      await test.step("Navigate to the home page (first footer mount)", async () => {
        await page.goto("/");
        await expect(footer.root).toBeVisible();
      });

      await test.step("SPA-navigate to /schools via the header nav link (second footer mount)", async () => {
        await header.megaLink("pre_skoly").click();
        await expect(page).toHaveURL(/\/schools$/);
        await expect(footer.root).toBeVisible();
      });

      await test.step("Verify exactly ONE footer_sponsors request fired across both mounts", async () => {
        expect(sponsorRequests).toHaveLength(1);
      });
    });

    test("TC-20: Copyright year is dynamic (year boundary)", async ({ page, footer }) => {
      await test.step("Shift the page clock to 2027-01-01T00:00:01Z", async () => {
        await page.clock.setSystemTime(new Date("2027-01-01T00:00:01Z"));
      });

      await test.step("Set desktop viewport (1280×800) and reload the page so the footer evaluates the shifted clock", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the copyright paragraph reads © 2027", async () => {
        await expect(footer.copyright).toHaveText("© 2027 subenai · Všetky práva vyhradené.");
      });

      await test.step("Verify no hardcoded 2026 literal appears in the visible footer text", async () => {
        const footerText = await footer.innerText();
        expect(footerText).not.toContain("2026");
      });
    });
  });
});
