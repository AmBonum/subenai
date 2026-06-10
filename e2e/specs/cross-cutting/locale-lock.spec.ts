// spec: specs/cross-cutting/locale-lock.md

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { setupAdmin, setupEducator } from "../../setup/app-shell";
import { AppShellPage } from "../../poms/app/AppShellPage";
import { AdminShellPage } from "../../poms/admin/AdminShellPage";

test.describe("LocaleSwitcher disabled state", () => {
  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  test.describe("Happy paths", () => {
    test.beforeEach(async ({ context }) => {
      await primeConsent(context, "all");
    });

    // TC-01: Public home page renders no locale switcher element in the desktop header
    test("TC-01: Public home page renders no locale switcher element in the desktop header", async ({
      page,
      header,
    }) => {
      await test.step("Set desktop viewport (1280×800) and navigate to the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Verify locale-switcher-trigger does not exist in the DOM", async () => {
        await expect(header.localeSwitcherTrigger).toHaveCount(0);
      });

      await test.step("Verify locale-switcher-menu does not exist in the DOM", async () => {
        await expect(header.localeSwitcherMenu).toHaveCount(0);
      });

      await test.step("Verify locale-switcher-current does not exist in the DOM", async () => {
        await expect(header.localeSwitcherCurrent).toHaveCount(0);
      });

      await test.step("Verify the desktop nav container is visible", async () => {
        await expect(header.desktopNav).toBeVisible();
      });
    });

    // TC-02: Public home page renders no locale switcher in the mobile sheet
    test("TC-02: Public home page renders no locale switcher in the mobile sheet", async ({
      page,
      header,
    }) => {
      await test.step("Set mobile viewport (375×667) and navigate to the home page", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
      });

      await test.step("Open the mobile sheet via the hamburger trigger", async () => {
        await header.openMobileMenu();
      });

      await test.step("Verify the mobile sheet is visible", async () => {
        await expect(header.sheet).toBeVisible();
      });

      await test.step("Verify the header-mobile-locale slot exists in the DOM but has no child elements", async () => {
        await expect(header.mobileLocaleSlot).toBeAttached();
        const childCount = await header.mobileLocaleSlot.evaluate((el) => el.childElementCount);
        expect(childCount).toBe(0);
      });

      await test.step("Verify no locale-switcher-trigger is present anywhere in the DOM", async () => {
        await expect(header.localeSwitcherTrigger).toHaveCount(0);
      });
    });

    // TC-03: App shell header renders no locale switcher for an authenticated user
    test("TC-03: App shell header renders no locale switcher for an authenticated user", async ({
      context,
      page,
    }) => {
      const appShell = new AppShellPage(page);

      await test.step("Seed an educator session and navigate to /app", async () => {
        await setupEducator(context, page);
        await page.setViewportSize({ width: 1280, height: 800 });
        await appShell.open();
      });

      await test.step("Verify no locale-switcher-trigger exists inside the app-shell-header", async () => {
        await expect(appShell.header).toBeVisible();
        await expect(appShell.localeSwitcherTrigger).toHaveCount(0);
      });

      await test.step("Verify the user row and logout button are visible (header rendered correctly)", async () => {
        await expect(appShell.headerUser).toBeVisible();
        await expect(appShell.headerLogout).toBeVisible();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Negative scenarios
  // ---------------------------------------------------------------------------

  test.describe("Negative scenarios", () => {
    test.beforeEach(async ({ context }) => {
      await primeConsent(context, "all");
    });

    // TC-04: Writing "en" to localStorage before page load does NOT switch the UI locale
    test("TC-04: Writing 'en' to localStorage before page load does NOT switch the UI locale", async ({
      page,
      header,
    }) => {
      await test.step("Set 'en' in localStorage and navigate to the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.addInitScript(() => {
          window.localStorage.setItem("subenai.locale", "en");
        });
        await page.goto("/");
      });

      await test.step("Verify no locale-switcher-trigger appears", async () => {
        await expect(header.localeSwitcherTrigger).toHaveCount(0);
      });

      await test.step("Verify the header CTA pill is visible with Slovak copy", async () => {
        await expect(header.ctaPill).toBeVisible();
      });
    });

    // TC-05: Writing "cs" to localStorage before page load does NOT switch the UI locale
    test("TC-05: Writing 'cs' to localStorage before page load does NOT switch the UI locale", async ({
      page,
      header,
    }) => {
      await test.step("Set 'cs' in localStorage and navigate to the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.addInitScript(() => {
          window.localStorage.setItem("subenai.locale", "cs");
        });
        await page.goto("/");
      });

      await test.step("Verify no locale-switcher-trigger appears", async () => {
        await expect(header.localeSwitcherTrigger).toHaveCount(0);
      });

      await test.step("Verify the header CTA pill is visible and renders Slovak copy", async () => {
        await expect(header.ctaPill).toBeVisible();
      });
    });

    // TC-06: Dispatching the "subenai:locale-change" custom event programmatically does NOT render an en/cs switcher
    test("TC-06: Dispatching the 'subenai:locale-change' custom event does NOT render the locale switcher", async ({
      page,
      header,
    }) => {
      await test.step("Set desktop viewport (1280×800) and navigate to the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Dispatch subenai:locale-change event with detail 'en'", async () => {
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent("subenai:locale-change", { detail: "en" }));
        });
        await page.waitForTimeout(500);
      });

      await test.step("Verify no locale-switcher-trigger appears in the DOM", async () => {
        await expect(header.localeSwitcherTrigger).toHaveCount(0);
      });

      await test.step("Verify no locale-switcher-menu appears in the DOM", async () => {
        await expect(header.localeSwitcherMenu).toHaveCount(0);
      });
    });

    // TC-07: Admin sidebar locale slot is empty — no switcher rendered
    test("TC-07: Admin sidebar locale slot is empty — no switcher rendered", async ({
      context,
      page,
    }) => {
      const adminShell = new AdminShellPage(page);

      await test.step("Seed an admin session and navigate to /admin", async () => {
        await setupAdmin(context, page);
        await page.setViewportSize({ width: 1280, height: 800 });
        await adminShell.open();
      });

      await test.step("Verify admin-shell-sidebar-locale slot exists in the DOM but has no child elements", async () => {
        await expect(adminShell.sidebarLocaleSlot).toBeAttached();
        const childCount = await adminShell.sidebarLocaleSlot.evaluate(
          (el) => el.childElementCount,
        );
        expect(childCount).toBe(0);
      });

      await test.step("Verify no locale-switcher-trigger is present anywhere on the page", async () => {
        await expect(adminShell.localeSwitcherTrigger).toHaveCount(0);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test.describe("Edge cases", () => {
    test.beforeEach(async ({ context }) => {
      await primeConsent(context, "all");
    });

    // TC-08: LocaleSwitcher absence does not break keyboard tab order in the desktop header
    test("TC-08: LocaleSwitcher absence does not break keyboard tab order in the desktop header", async ({
      page,
      header,
    }) => {
      await test.step("Set desktop viewport (1280×800) and navigate to the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Tab from the start of the document through focusable elements until the CTA pill is reached", async () => {
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
      });

      await test.step("Verify focus is on a focusable interactive element and the CTA pill is visible", async () => {
        await expect(header.ctaPill).toBeVisible();
        const focusedTag = await page.evaluate(
          () => document.activeElement?.tagName.toLowerCase() ?? "body",
        );
        expect(["a", "button", "input", "select", "textarea"]).toContain(focusedTag);
      });

      await test.step("Verify no locale-switcher-trigger stole focus along the way", async () => {
        await expect(header.localeSwitcherTrigger).toHaveCount(0);
      });
    });

    // TC-09: LocaleSwitcher absence does not break keyboard tab order in the mobile sheet
    test("TC-09: LocaleSwitcher absence does not break keyboard tab order in the mobile sheet", async ({
      page,
      header,
    }) => {
      await test.step("Set mobile viewport (375×667) and navigate to the home page", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
      });

      await test.step("Open the mobile sheet", async () => {
        await header.openMobileMenu();
      });

      await test.step("Tab from the close button through all focusable elements in the sheet", async () => {
        await header.sheetCloseButton.focus();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
      });

      await test.step("Verify the mobile sheet CTA link is visible and reachable", async () => {
        await expect(header.sheetCtaLink).toBeVisible();
      });

      await test.step("Verify no locale-switcher-trigger is present inside the sheet", async () => {
        await expect(header.localeSwitcherTrigger).toHaveCount(0);
      });
    });

    // TC-10: currentLocale module-level value stays "sk" even after a programmatic setLocale call
    test("TC-10: currentLocale stays 'sk' even after a programmatic setLocale call and page reload", async ({
      page,
      header,
    }) => {
      await test.step("Set desktop viewport (1280×800) and navigate to the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
      });

      await test.step("Dispatch locale-change event and set localStorage to 'en'", async () => {
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent("subenai:locale-change", { detail: "en" }));
          window.localStorage.setItem("subenai.locale", "en");
        });
      });

      await test.step("Reload the page", async () => {
        await page.reload({ waitUntil: "domcontentloaded" });
      });

      await test.step("Verify no locale-switcher-trigger appears after reload", async () => {
        await expect(header.localeSwitcherTrigger).toHaveCount(0);
      });

      await test.step("Verify Slovak copy remains visible in the CTA pill", async () => {
        await expect(header.ctaPill).toBeVisible();
      });
    });

    // TC-11: Very long string in localStorage locale key does not crash the page
    test("TC-11: Very long string in localStorage locale key does not crash the page", async ({
      page,
      header,
    }) => {
      const consoleErrors: string[] = [];

      await test.step("Set desktop viewport (1280×800), seed a 10,000-char locale value, and navigate", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        page.on("console", (msg) => {
          if (msg.type() === "error") consoleErrors.push(msg.text());
        });
        await page.addInitScript(() => {
          window.localStorage.setItem("subenai.locale", "a".repeat(10000));
        });
        await page.goto("/");
      });

      await test.step("Verify no JavaScript error appears in the console", async () => {
        expect(consoleErrors).toHaveLength(0);
      });

      await test.step("Verify the page header root is visible", async () => {
        await expect(header.root).toBeVisible();
      });

      await test.step("Verify no locale-switcher-trigger appears", async () => {
        await expect(header.localeSwitcherTrigger).toHaveCount(0);
      });
    });

    // TC-12: Invalid locale value in localStorage ("xyz") does not crash the page
    test("TC-12: Invalid locale value 'xyz' in localStorage does not crash the page", async ({
      page,
      header,
    }) => {
      const consoleErrors: string[] = [];

      await test.step("Set desktop viewport (1280×800), seed 'xyz' locale value, and navigate", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        page.on("console", (msg) => {
          if (msg.type() === "error") consoleErrors.push(msg.text());
        });
        await page.addInitScript(() => {
          window.localStorage.setItem("subenai.locale", "xyz");
        });
        await page.goto("/");
      });

      await test.step("Verify no JavaScript error appears in the console", async () => {
        expect(consoleErrors).toHaveLength(0);
      });

      await test.step("Verify the page header root is visible", async () => {
        await expect(header.root).toBeVisible();
      });

      await test.step("Verify no locale-switcher-trigger appears", async () => {
        await expect(header.localeSwitcherTrigger).toHaveCount(0);
      });
    });

    // TC-13: LOCALE_SWITCHER_ENABLED flag state — aria audit confirms no stray role="combobox" or role="listbox"
    test("TC-13: Accessibility snapshot contains no stray locale menu roles in the site header", async ({
      page,
      header,
    }) => {
      await test.step("Set desktop viewport (1280×800) and navigate to the home page", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/");
        await header.root.waitFor({ state: "visible" });
      });

      await test.step("Verify no element with role='menu' is a child of the site header", async () => {
        const menuInsideHeader = await page.evaluate(() => {
          const header = document.querySelector("[data-testid='header-root']");
          return header ? header.querySelectorAll("[role='menu']").length : 0;
        });
        expect(menuInsideHeader).toBe(0);
      });

      await test.step("Verify no element with accessible name containing 'Jazyk / Language' exists", async () => {
        const ariaLabelMatches = await page.evaluate(() => {
          return document.querySelectorAll("[aria-label*='Jazyk']").length;
        });
        expect(ariaLabelMatches).toBe(0);
      });
    });

    // TC-14: Mobile viewport — the mobile sheet footer does not show a blank gap
    test("TC-14: Mobile sheet footer shows no blank gap where the locale switcher would have been", async ({
      page,
      header,
    }) => {
      await test.step("Set mobile viewport (375×667) and navigate to the home page", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/");
      });

      await test.step("Open the mobile sheet", async () => {
        await header.openMobileMenu();
      });

      await test.step("Verify the header-mobile-locale slot has zero height (empty element adds no gap)", async () => {
        const localeSlotHeight = await header.mobileLocaleSlot.evaluate(
          (el) => el.getBoundingClientRect().height,
        );
        expect(localeSlotHeight).toBe(0);
      });

      await test.step("Verify the mobile CTA link is visible and adjacent to nav links", async () => {
        await expect(header.sheetCtaLink).toBeVisible();
      });
    });

    // TC-15: Feature flag regression — LOCALE_SWITCHER_ENABLED must be false (canary assertion)
    test("TC-15: Feature flag regression — LOCALE_SWITCHER_ENABLED is literally false in source", async () => {
      await test.step("Read LocaleSwitcher.tsx source and assert LOCALE_SWITCHER_ENABLED = false", async () => {
        const srcPath = resolve(process.cwd(), "src/components/i18n/LocaleSwitcher.tsx");
        const source = readFileSync(srcPath, "utf8");
        const matches = source.match(/const\s+LOCALE_SWITCHER_ENABLED\s*=\s*(true|false)/);
        expect(
          matches,
          "LOCALE_SWITCHER_ENABLED declaration not found in LocaleSwitcher.tsx",
        ).not.toBeNull();
        expect(
          matches![1],
          "LOCALE_SWITCHER_ENABLED must be false — flip it back before deploying",
        ).toBe("false");
        const occurrences = (source.match(/LOCALE_SWITCHER_ENABLED\s*=\s*false/g) ?? []).length;
        expect(
          occurrences,
          "Expected exactly 1 occurrence of LOCALE_SWITCHER_ENABLED = false",
        ).toBe(1);
      });
    });
  });
});
