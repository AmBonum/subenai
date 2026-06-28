// spec: specs/cross-cutting/site-header-and-menu.md
//
// Updated 2026-06-28 for the E55 academy cutover: the desktop nav is a Radix
// NavigationMenu with 4 top-level items — one hover/click trigger
// ("Sady testov" → testy) and three flat links ("Akadémia" → /academy,
// "Pre školy a lektorov" → /schools, "Podpora projektu" → /support). The
// "Školenia" panel is gone (/courses + /blog merged into the single flat
// "akademia" link → /academy). The mobile sheet renders the panel item as an
// accordion and flat items as links.
//
// E56 (mobile-nav redesign): on mobile the primary nav is a fixed bottom tab
// bar (`mobile-bottomnav-root`, hidden from `lg` up) with five items —
// home / tests / quicktest (raised centre CTA → /test) / academy / menu. The
// mobile top header is now just the logo (the old centre CTA
// `header-cta-mobile-bar` is removed). The hamburger (`header-mobile-trigger`)
// is DESKTOP-ONLY now: hidden below 1024 px, visible at ≥ 1024 (Tailwind
// `lg`). The sheet is opened on mobile from the bottom-nav Menu button and on
// desktop from the hamburger — the open state is shared, the content
// identical. The desktop/mobile breakpoint is now 1024 px (the `lg`
// breakpoint), not 820.

import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

test.describe("Site header and responsive navigation menu", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  test.describe("Happy paths", () => {
    test("TC-01: All four desktop nav items are visible and route to their targets", async ({
      page,
      header,
    }) => {
      await test.step("Set desktop viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the desktop nav shows the mega trigger and all three flat links", async () => {
        await expect(header.nav).toBeVisible();
        await expect(header.megaTrigger("testy")).toBeVisible();
        await expect(header.megaTrigger("testy")).toHaveText(/Sady testov/);
        await expect(header.megaLink("akademia")).toHaveText(/Akadémia/);
        await expect(header.megaLink("pre_skoly")).toHaveText(/Pre školy a lektorov/);
        await expect(header.megaLink("podpora")).toHaveText(/Podpora projektu/);
      });

      await test.step('Open the "Sady testov" panel and verify "Všetky sady" routes to /tests', async () => {
        await header.megaTrigger("testy").hover();
        await expect(header.megaPanel("testy")).toBeVisible();
        await header.megaPanelLink("testy", "all").click();
        await expect(page).toHaveURL(/\/tests$/);
      });

      await test.step('Return home, click "Akadémia" and verify it routes to /academy', async () => {
        await page.goto("/");
        await header.megaLink("akademia").click();
        await expect(page).toHaveURL(/\/academy$/);
      });

      await test.step('Return home, click "Pre školy a lektorov" and verify it routes to /schools', async () => {
        await page.goto("/");
        await header.megaLink("pre_skoly").click();
        await expect(page).toHaveURL(/\/schools$/);
      });

      await test.step('Return home, click "Podpora projektu" and verify it routes to /support', async () => {
        await page.goto("/");
        await header.megaLink("podpora").click();
        await expect(page).toHaveURL(/\/support$/);
      });
    });

    test("TC-02: The logo links to the home page from any route", async ({ page, header }) => {
      await test.step("Set desktop viewport and open /tests", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/tests");
      });

      await test.step("Click the logo and verify navigation to / with the header still rendered", async () => {
        await header.logoLink.click();
        await expect(page).toHaveURL(/\/$/);
        await expect(header.root).toBeVisible();
      });
    });

    test("TC-03: The CTA pill navigates to /test and adapts its label to the viewport", async ({
      page,
      header,
    }) => {
      await test.step("Set lg viewport (1280×800) and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step('Verify the CTA accessible name is "Spustiť rýchly test" and the long suffix is visible', async () => {
        await expect(header.ctaPill).toHaveAccessibleName(/Spustiť rýchly test/i);
        await expect(header.ctaPillLongSuffix).toBeVisible();
      });

      await test.step("Shrink to 900×700 and verify the long suffix becomes hidden while the accessible name persists", async () => {
        await page.setViewportSize({ width: 900, height: 700 });
        await expect(header.ctaPillLongSuffix).toBeHidden();
        await expect(header.ctaPill).toHaveAccessibleName(/Spustiť rýchly test/i);
      });

      await test.step("Click the CTA and verify navigation to /test", async () => {
        await header.ctaPill.click();
        await expect(page).toHaveURL(/\/test$/);
      });
    });

    test("TC-04: The bottom-nav Menu button opens a Sheet containing every nav item plus the CTA", async ({
      page,
      header,
      bottomNav,
    }) => {
      await test.step("Set mobile viewport (375×667) and open the home page", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
      });

      await test.step("Verify the desktop nav + hamburger are hidden and the bottom nav is visible", async () => {
        await expect(header.desktopNav).toBeHidden();
        await expect(header.hamburgerTrigger).toBeHidden();
        await expect(bottomNav.root).toBeVisible();
      });

      await test.step("Open the mobile sheet via the bottom-nav Menu button", async () => {
        await header.openMobileMenu();
      });

      await test.step("Verify the sheet shows the close button, logo, accordions, flat links and the CTA", async () => {
        await expect(header.sheetCloseButton).toBeVisible();
        await expect(header.sheetLogoLink).toBeVisible();
        await expect(header.sheetNavTrigger("testy")).toHaveText(/Sady testov/);
        await expect(header.sheetNavLink("akademia")).toHaveText(/Akadémia/);
        await expect(header.sheetNavLink("pre_skoly")).toHaveText(/Pre školy a lektorov/);
        await expect(header.sheetNavLink("podpora")).toHaveText(/Podpora projektu/);
        await expect(header.sheetCtaLink).toBeVisible();
        await expect(header.sheetCtaLink).toHaveText(/Spustiť test/);
      });

      await test.step("Close the sheet and verify the bottom nav is still visible", async () => {
        await header.closeMobileMenu();
        await expect(bottomNav.root).toBeVisible();
      });
    });

    test("TC-05: Clicking a nav link inside the Sheet navigates and auto-closes the menu", async ({
      page,
      header,
      bottomNav,
    }) => {
      await test.step("Set mobile viewport, open the home page and open the sheet", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
        await header.openMobileMenu();
      });

      await test.step('Expand "Sady testov" and click "Všetky sady" inside the panel', async () => {
        await header.sheetNavTrigger("testy").click();
        await header.sheetNavPanelLink("testy", "all").click();
      });

      await test.step("Verify navigation to /tests and that the sheet auto-closed", async () => {
        await expect(page).toHaveURL(/\/tests$/);
        await expect(header.sheet).toBeHidden();
        await expect(bottomNav.root).toBeVisible();
      });
    });

    test("TC-06: Active route is highlighted in the desktop nav", async ({ page, header }) => {
      await test.step("Set desktop viewport and open /academy", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/academy");
      });

      await test.step('Verify only "Akadémia" carries the active foreground class', async () => {
        await expect(header.megaLink("akademia")).toHaveClass(/text-foreground/);
        await expect(header.megaTrigger("testy")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("pre_skoly")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("podpora")).toHaveClass(/text-muted-foreground/);
      });

      await test.step('Navigate to /support and verify the active highlight follows to "Podpora projektu"', async () => {
        await page.goto("/support");
        await expect(header.megaLink("podpora")).toHaveClass(/text-foreground/);
        await expect(header.megaLink("akademia")).toHaveClass(/text-muted-foreground/);
      });
    });

    test("TC-07: A nested route (/tests/eshop) highlights only the most-specific matching nav entry", async ({
      page,
      header,
    }) => {
      await test.step("Set desktop viewport and open /tests/eshop", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/tests/eshop");
      });

      await test.step('Verify only "Sady testov" is highlighted, the other items remain muted', async () => {
        await expect(header.megaTrigger("testy")).toHaveClass(/text-foreground/);
        await expect(header.megaLink("akademia")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("pre_skoly")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("podpora")).toHaveClass(/text-muted-foreground/);
      });
    });

    test("TC-08: Active route is highlighted inside the mobile Sheet", async ({ page, header }) => {
      await test.step("Set mobile viewport, open /academy and open the sheet", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/academy");
        await header.openMobileMenu();
      });

      await test.step('Verify only the "Akadémia" flat link has the active background', async () => {
        await expect(header.sheetNavLink("akademia")).toHaveClass(/bg-primary\/10/);
        await expect(header.sheetNavTrigger("testy")).not.toHaveClass(/bg-primary\/10/);
        await expect(header.sheetNavLink("pre_skoly")).not.toHaveClass(/bg-primary\/10/);
        await expect(header.sheetNavLink("podpora")).not.toHaveClass(/bg-primary\/10/);
      });
    });

    test("TC-08b: The mobile bottom nav shows all five items with correct hrefs and marks the active tab", async ({
      page,
      header,
      bottomNav,
    }) => {
      await test.step("Set mobile viewport (375×667) and open /academy", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/academy");
      });

      await test.step("Verify the bottom nav is visible and the desktop nav + hamburger are hidden", async () => {
        await expect(bottomNav.root).toBeVisible();
        await expect(header.desktopNav).toBeHidden();
        await expect(header.hamburgerTrigger).toBeHidden();
      });

      await test.step("Verify the four link items carry their correct hrefs", async () => {
        await expect(bottomNav.home).toHaveAttribute("href", "/");
        await expect(bottomNav.tests).toHaveAttribute("href", "/tests");
        await expect(bottomNav.quicktest).toHaveAttribute("href", "/test");
        await expect(bottomNav.academy).toHaveAttribute("href", "/academy");
        await expect(bottomNav.menu).toBeVisible();
      });

      await test.step("Verify only the Akadémia tab claims aria-current=page on /academy", async () => {
        await expect(bottomNav.academy).toHaveAttribute("aria-current", "page");
        await expect(bottomNav.home).not.toHaveAttribute("aria-current", "page");
        await expect(bottomNav.tests).not.toHaveAttribute("aria-current", "page");
        await expect(bottomNav.quicktest).not.toHaveAttribute("aria-current", "page");
      });

      await test.step("Verify /test activates the quicktest tab but NOT the tests tab", async () => {
        await page.goto("/test");
        await expect(bottomNav.quicktest).toHaveAttribute("aria-current", "page");
        await expect(bottomNav.tests).not.toHaveAttribute("aria-current", "page");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Negative scenarios
  // ---------------------------------------------------------------------------

  test.describe("Negative scenarios", () => {
    test("TC-09: The hamburger trigger is not visible on a desktop viewport", async ({
      page,
      header,
    }) => {
      await test.step("Set desktop viewport and open the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify the hamburger is hidden and the desktop nav is visible", async () => {
        await expect(header.hamburgerTrigger).toBeHidden();
        await expect(header.desktopNav).toBeVisible();
      });
    });

    test("TC-10: The desktop nav is not visible on a mobile viewport", async ({
      page,
      header,
      bottomNav,
    }) => {
      await test.step("Set mobile viewport and open the home page", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
      });

      await test.step("Verify the desktop nav + hamburger are hidden and the bottom nav is visible", async () => {
        await expect(header.desktopNav).toBeHidden();
        await expect(header.hamburgerTrigger).toBeHidden();
        await expect(bottomNav.root).toBeVisible();
      });
    });

    test("TC-11: The header still renders on an unknown (404) route", async ({ page, header }) => {
      await test.step("Set desktop viewport and open an unknown route", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/this-route-does-not-exist");
      });

      await test.step("Verify the header, every nav item and the CTA are still rendered", async () => {
        await expect(header.root).toBeVisible();
        await expect(header.megaTrigger("testy")).toBeVisible();
        await expect(header.megaLink("akademia")).toBeVisible();
        await expect(header.megaLink("pre_skoly")).toBeVisible();
        await expect(header.megaLink("podpora")).toBeVisible();
        await expect(header.ctaPill).toBeVisible();
      });

      await test.step("Verify no nav item claims the active state on a 404 route", async () => {
        await expect(header.megaTrigger("testy")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("akademia")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("pre_skoly")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("podpora")).toHaveClass(/text-muted-foreground/);
      });
    });

    test("TC-12: Repeatedly opening and closing the mobile Sheet does not leak state", async ({
      page,
      header,
      bottomNav,
    }) => {
      const errors: string[] = [];

      await test.step("Set mobile viewport, open the home page and start collecting console errors", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
        page.on("console", (msg) => {
          if (msg.type() === "error") errors.push(msg.text());
        });
      });

      await test.step("Open and close the sheet 10 times in a row", async () => {
        for (let i = 0; i < 10; i++) {
          await header.openMobileMenu();
          await header.closeMobileMenu();
        }
      });

      await test.step("Verify no console errors fired and the bottom-nav Menu button is still usable", async () => {
        expect(errors).toHaveLength(0);
        await expect(bottomNav.menu).toBeVisible();
      });
    });

    test("TC-13: The route /test does not appear as an active nav item (CTA excluded from MEGA_ITEMS)", async ({
      page,
      header,
    }) => {
      await test.step("Set desktop viewport and open /test", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/test");
      });

      await test.step("Verify no nav item is highlighted and the CTA carries no active background", async () => {
        await expect(header.megaTrigger("testy")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("akademia")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("pre_skoly")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("podpora")).toHaveClass(/text-muted-foreground/);
        await expect(header.ctaPill).not.toHaveClass(/bg-primary\/10/);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test.describe("Edge cases", () => {
    test("TC-14: Breakpoint at exactly 1024 px (lg) swaps the bottom nav/hamburger and desktop nav", async ({
      page,
      header,
      bottomNav,
    }) => {
      await test.step("Open the home page", async () => {
        await page.goto("/");
      });

      await test.step("At 1023 px verify the hamburger is hidden, the bottom nav is visible and the desktop nav is hidden", async () => {
        await page.setViewportSize({ width: 1023, height: 800 });
        await expect(header.hamburgerTrigger).toBeHidden();
        await expect(bottomNav.root).toBeVisible();
        await expect(header.desktopNav).toBeHidden();
      });

      const logoBeforeResize = await test.step("Capture the logo position at 1023 px", async () => {
        return header.logoLink.boundingBox();
      });

      await test.step("Resize to 1024 px and verify the desktop nav + hamburger appear while the bottom nav hides", async () => {
        await page.setViewportSize({ width: 1024, height: 800 });
        await expect(header.desktopNav).toBeVisible();
        await expect(header.hamburgerTrigger).toBeVisible();
        await expect(bottomNav.root).toBeHidden();
      });

      await test.step("Verify the logo's x-position barely shifts across the breakpoint", async () => {
        const logoAfterResize = await header.logoLink.boundingBox();
        expect(logoAfterResize?.x).toBeCloseTo(logoBeforeResize?.x ?? 0, -1);
      });
    });

    test("TC-15: At 375×667 the header fits the viewport without horizontal scroll", async ({
      page,
      header,
    }) => {
      await test.step("Set mobile viewport and open the home page", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
      });

      await test.step("Verify the document scrollWidth does not exceed 375 px", async () => {
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(375);
      });

      await test.step("Open the sheet and verify the CTA is visible", async () => {
        await header.openMobileMenu();
        await expect(header.sheetCtaLink).toBeVisible();
      });
    });

    test("TC-16: Keyboard tab order on the desktop header", async ({ page, header }) => {
      await test.step("Set desktop viewport, open the home page and clear focus", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
        await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
      });

      await test.step("Tab once and verify the logo is focused", async () => {
        await page.keyboard.press("Tab");
        await expect(header.logoLink).toBeFocused();
      });

      await test.step("Tab through the nav items in order (Sady testov → Akadémia → Pre školy a lektorov → Podpora projektu)", async () => {
        await page.keyboard.press("Tab");
        await expect(header.megaTrigger("testy")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(header.megaLink("akademia")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(header.megaLink("pre_skoly")).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(header.megaLink("podpora")).toBeFocused();
      });

      await test.step("Tab once more and verify the CTA pill is focused", async () => {
        await page.keyboard.press("Tab");
        await expect(header.ctaPill).toBeFocused();
      });

      await test.step("Press Enter and verify navigation to /test", async () => {
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/test$/);
      });
    });

    test("TC-17: Focus trap inside the mobile Sheet and Escape closes it", async ({
      page,
      header,
      bottomNav,
    }) => {
      await test.step("Set mobile viewport, open the home page and open the sheet", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
        await header.openMobileMenu();
      });

      await test.step("Verify the close button receives focus when the sheet opens", async () => {
        await expect(header.sheetCloseButton).toBeFocused();
      });

      await test.step("Press Escape and verify the sheet closes and focus returns to the bottom-nav Menu button", async () => {
        await page.keyboard.press("Escape");
        await expect(header.sheet).toBeHidden();
        await expect(bottomNav.menu).toBeFocused();
      });
    });

    test("TC-18: Required ARIA attributes are present and correct", async ({
      page,
      header,
      bottomNav,
    }) => {
      await test.step("Set mobile viewport and open the home page", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
      });

      await test.step("Verify the navigation landmark, logo and the bottom-nav Menu button have correct accessible names + aria-haspopup", async () => {
        await expect(header.navByRole).toHaveAccessibleName(/Hlavná navigácia/i);
        await expect(header.logoLink).toHaveAccessibleName(/subenai — domov/i);
        await expect(bottomNav.menu).toHaveAttribute("aria-haspopup", "dialog");
      });

      await test.step("Open the sheet and verify the bottom-nav Menu button is expanded + close button and CTA accessible names", async () => {
        await header.openMobileMenu();
        await expect(bottomNav.menu).toHaveAttribute("aria-expanded", "true");
        await expect(header.sheetCloseButton).toHaveAccessibleName(/Zavrieť menu/i);
        await expect(header.sheetCtaLink).toHaveAccessibleName(/Spustiť rýchly test/i);
      });
    });

    test("TC-19: Browser back button after the Sheet auto-closed on navigation", async ({
      page,
      header,
      bottomNav,
    }) => {
      await test.step("Set mobile viewport, open the home page and open the sheet", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
        await header.openMobileMenu();
      });

      await test.step('Click "Akadémia" inside the sheet and verify the sheet auto-closed', async () => {
        await header.sheetNavLink("akademia").click();
        await expect(page).toHaveURL(/\/academy$/);
        await expect(header.sheet).toBeHidden();
      });

      await test.step("Press the browser back button and verify the home page returns with the sheet still closed", async () => {
        await page.goBack();
        await expect(page).toHaveURL(/\/$/);
        await expect(header.sheet).toBeHidden();
        await expect(bottomNav.root).toBeVisible();
      });
    });

    test("TC-20: Hash navigation does not toggle active state", async ({ page, header }) => {
      await test.step("Set desktop viewport and open /#section", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/#section");
      });

      await test.step("Verify no nav item claims the active state for a hash-only path", async () => {
        await expect(header.megaTrigger("testy")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("akademia")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("pre_skoly")).toHaveClass(/text-muted-foreground/);
        await expect(header.megaLink("podpora")).toHaveClass(/text-muted-foreground/);
      });
    });

    test("TC-21: Sticky header with backdrop blur stays positioned during scroll", async ({
      page,
      header,
    }) => {
      await test.step("Set desktop viewport and open /academy", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/academy");
      });

      await test.step("Scroll the page down by 1000 px", async () => {
        // mouse.wheel instead of evaluate(scrollBy): the /academy route can
        // still be settling its router context right after goto, and a
        // destroyed execution context kills evaluate (flake, 2026-06-12).
        await expect(header.root).toBeVisible();
        await page.mouse.wheel(0, 1000);
      });

      await test.step("Verify the header remains sticky at top:0 with z-index ≥ 40 and the backdrop-blur class", async () => {
        const { position, top, zIndex } = await header.rootComputedStyle();
        expect(position).toBe("sticky");
        expect(top).toBe("0px");
        expect(Number(zIndex)).toBeGreaterThanOrEqual(40);
        await expect(header.root).toHaveClass(/backdrop-blur/);
      });
    });

    test("TC-22: At 375 px the Sheet width does not exceed the viewport", async ({
      page,
      header,
    }) => {
      await test.step("Set mobile viewport, open the home page and open the sheet", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
        await header.openMobileMenu();
      });

      await test.step("Verify the sheet width and the document scrollWidth both fit within 375 px", async () => {
        const box = await header.sheet.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(375);
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(375);
      });
    });

    test("TC-23: Path-prefix collision — /academy/$slug highlights only Akadémia, never Sady testov", async ({
      page,
      header,
    }) => {
      await test.step("Set desktop viewport and open /academy/sms-smishing", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/academy/sms-smishing");
      });

      await test.step('Verify only "Akadémia" is highlighted', async () => {
        await expect(header.megaLink("akademia")).toHaveClass(/text-foreground/);
        await expect(header.megaTrigger("testy")).toHaveClass(/text-muted-foreground/);
      });

      await test.step('Navigate to /tests/eshop and verify the highlight follows to "Sady testov"', async () => {
        await page.goto("/tests/eshop");
        await expect(header.megaTrigger("testy")).toHaveClass(/text-foreground/);
        await expect(header.megaLink("akademia")).toHaveClass(/text-muted-foreground/);
      });
    });
  });
});
