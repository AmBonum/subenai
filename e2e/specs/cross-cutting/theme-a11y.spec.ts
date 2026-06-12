// E52 — Light/Dark/System theme + accessibility layer (font size, reduced
// motion, skip link). The persisted choices live in localStorage
// (`subenai-theme`, `subenai-a11y-font`, `subenai-a11y-motion`) and a
// synchronous bootstrap in index.html applies them before first paint;
// ThemeProvider / AccessibilityProvider keep them in sync at runtime.
// Slovak labels asserted verbatim from src/i18n/locales/sk/marketing.json
// (`theme.*`, `a11y.*`).

import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

const THEME_KEY = "subenai-theme";
const FONT_KEY = "subenai-a11y-font";

async function htmlHasClass(page: Page, className: string): Promise<boolean> {
  return page.evaluate(
    (cls: string) => document.documentElement.classList.contains(cls),
    className,
  );
}

async function htmlFontSize(page: Page): Promise<string> {
  return page.evaluate(() => document.documentElement.style.fontSize);
}

async function readLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k: string) => window.localStorage.getItem(k), key);
}

test.describe("Theme — light/dark/system (E52)", () => {
  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("TC-01: Default 'system' follows the OS color scheme", async ({ page }) => {
    await test.step("Emulate a dark OS color scheme and open the home page", async () => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/");
    });

    await test.step("Verify <html> carries .dark with empty storage", async () => {
      expect(await htmlHasClass(page, "dark")).toBe(true);
      expect(await readLocalStorage(page, THEME_KEY)).toBeNull();
    });

    await test.step("Emulate a light OS color scheme and reload", async () => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.reload();
    });

    await test.step("Verify <html> does NOT carry .dark", async () => {
      expect(await htmlHasClass(page, "dark")).toBe(false);
    });
  });

  test("TC-02: Picking 'Svetlý' removes .dark and persists across reload and navigation", async ({
    page,
    themeControls,
  }) => {
    await test.step("Open home with a dark OS scheme (system resolves dark)", async () => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/");
      expect(await htmlHasClass(page, "dark")).toBe(true);
    });

    await test.step("Open the theme toggle and pick 'Svetlý'", async () => {
      await themeControls.themeToggleTrigger.click();
      await expect(themeControls.themeToggleOption("light")).toHaveText(/Svetlý/);
      await themeControls.themeToggleOption("light").click();
    });

    await test.step("Verify .dark is removed and 'light' is persisted", async () => {
      expect(await htmlHasClass(page, "dark")).toBe(false);
      expect(await readLocalStorage(page, THEME_KEY)).toBe("light");
    });

    await test.step("Reload — still light despite the dark OS scheme", async () => {
      await page.reload();
      expect(await htmlHasClass(page, "dark")).toBe(false);
    });

    await test.step("Navigate to /tests — still light", async () => {
      await page.goto("/tests");
      expect(await htmlHasClass(page, "dark")).toBe(false);
    });
  });

  test("TC-03: Picking 'Tmavý' adds .dark and shows the check on re-open", async ({
    page,
    themeControls,
  }) => {
    await test.step("Open home with a light OS scheme", async () => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/");
      expect(await htmlHasClass(page, "dark")).toBe(false);
    });

    await test.step("Open the theme toggle and pick 'Tmavý'", async () => {
      await themeControls.themeToggleTrigger.click();
      await expect(themeControls.themeToggleOption("dark")).toHaveText(/Tmavý/);
      await themeControls.themeToggleOption("dark").click();
      await expect(themeControls.themeToggleMenu).toBeHidden();
    });

    await test.step("Verify .dark is applied and persisted", async () => {
      expect(await htmlHasClass(page, "dark")).toBe(true);
      expect(await readLocalStorage(page, THEME_KEY)).toBe("dark");
    });

    await test.step("Re-open the menu — check icon sits on the dark option only", async () => {
      await themeControls.themeToggleTrigger.click();
      await expect(themeControls.themeToggleMenu).toBeVisible();
      await expect(themeControls.themeToggleCheck("dark")).toBeVisible();
      await expect(themeControls.themeToggleCheck("light")).toBeHidden();
      await expect(themeControls.themeToggleCheck("system")).toBeHidden();
    });
  });

  test("TC-04: No-flash — bootstrap applies .dark before the app mounts", async ({ page }) => {
    await test.step("Prime localStorage to dark and record when .dark first appears", async () => {
      await page.addInitScript((key: string) => {
        window.localStorage.setItem(key, "dark");
        const w = window as unknown as { __darkReadyState?: string };
        const observer = new MutationObserver(() => {
          if (document.documentElement?.classList.contains("dark")) {
            w.__darkReadyState = document.readyState;
            observer.disconnect();
          }
        });
        observer.observe(document, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class"],
        });
      }, THEME_KEY);
    });

    await test.step("Navigate and assert .dark is present at domcontentloaded", async () => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      expect(await htmlHasClass(page, "dark")).toBe(true);
    });

    await test.step("Verify .dark was applied while the document was still loading", async () => {
      const readyState = await page.evaluate(
        () => (window as unknown as { __darkReadyState?: string }).__darkReadyState,
      );
      expect(readyState).toBe("loading");
    });
  });

  test("TC-05: Anonymous respondent surface /test renders the theme toggle", async ({
    page,
    header,
    themeControls,
  }) => {
    await test.step("Open /test", async () => {
      await page.goto("/test");
    });

    await test.step("Verify the public header is present with the theme toggle", async () => {
      await expect(header.root).toBeVisible();
      await expect(themeControls.themeToggleTrigger).toBeVisible();
      await expect(themeControls.a11yMenuTrigger).toBeVisible();
    });
  });

  test("TC-06: 'System' reacts to a live OS color-scheme change without reload", async ({
    page,
  }) => {
    await test.step("Open home with a light OS scheme (system default)", async () => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/");
      expect(await htmlHasClass(page, "dark")).toBe(false);
    });

    await test.step("Flip the emulated OS scheme to dark — .dark appears live", async () => {
      await page.emulateMedia({ colorScheme: "dark" });
      await expect.poll(() => htmlHasClass(page, "dark")).toBe(true);
    });

    await test.step("Flip back to light — .dark is removed live", async () => {
      await page.emulateMedia({ colorScheme: "light" });
      await expect.poll(() => htmlHasClass(page, "dark")).toBe(false);
    });
  });
});

test.describe("Accessibility layer — font size, motion, skip link (E52)", () => {
  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("TC-07: Font 'Extra veľké' sets 125% and persists across reload and navigation", async ({
    page,
    themeControls,
  }) => {
    await test.step("Open home and pick 'Extra veľké' in the accessibility menu", async () => {
      await page.goto("/");
      await themeControls.a11yMenuTrigger.click();
      await expect(themeControls.a11yFontOption("xl")).toHaveText(/Extra veľké/);
      await themeControls.a11yFontOption("xl").click();
    });

    await test.step("Verify <html> font-size is 125% and the choice is persisted", async () => {
      expect(await htmlFontSize(page)).toBe("125%");
      expect(await readLocalStorage(page, FONT_KEY)).toBe("xl");
    });

    await test.step("Reload — font-size still 125% (bootstrap re-applies)", async () => {
      await page.reload();
      expect(await htmlFontSize(page)).toBe("125%");
    });

    await test.step("Navigate to /tests — font-size still 125%", async () => {
      await page.goto("/tests");
      expect(await htmlFontSize(page)).toBe("125%");
    });
  });

  test("TC-08: Motion 'Zapnuté' pins .reduce-motion on; 'Vypnuté' pins it off despite OS reduce", async ({
    page,
    themeControls,
  }) => {
    await test.step("Open home and pick motion 'Zapnuté'", async () => {
      await page.goto("/");
      await themeControls.a11yMenuTrigger.click();
      await expect(themeControls.a11yMotionOption("on")).toHaveText(/Zapnuté/);
      await themeControls.a11yMotionOption("on").click();
    });

    await test.step("Verify .reduce-motion is applied", async () => {
      expect(await htmlHasClass(page, "reduce-motion")).toBe(true);
    });

    await test.step("Emulate OS reduced-motion and pick 'Vypnuté' — pinned off wins", async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await themeControls.a11yMenuTrigger.click();
      await expect(themeControls.a11yMotionOption("off")).toHaveText(/Vypnuté/);
      await themeControls.a11yMotionOption("off").click();
      expect(await htmlHasClass(page, "reduce-motion")).toBe(false);
    });

    await test.step("Reload — still off (persisted 'off' ignores the OS preference)", async () => {
      await page.reload();
      expect(await htmlHasClass(page, "reduce-motion")).toBe(false);
    });
  });

  test("TC-09: Motion 'Systém' resolves the emulated OS reduced-motion to .reduce-motion", async ({
    page,
  }) => {
    await test.step("Emulate OS reduced-motion before navigation", async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
    });

    await test.step("Verify .reduce-motion is present with the default 'system' preference", async () => {
      expect(await htmlHasClass(page, "reduce-motion")).toBe(true);
    });
  });

  test("TC-10: Skip link is the first Tab stop and moves focus to #main on Enter", async ({
    page,
    themeControls,
  }) => {
    await test.step("Open home and press Tab once from a fresh load", async () => {
      await page.goto("/");
      await page.keyboard.press("Tab");
    });

    await test.step("Verify the skip link is focused, visible, and carries the Slovak label", async () => {
      await expect(themeControls.skipLink).toBeFocused();
      await expect(themeControls.skipLink).toBeVisible();
      await expect(themeControls.skipLink).toHaveText("Preskočiť na obsah");
    });

    await test.step("Press Enter — focus lands on the #main content container", async () => {
      await page.keyboard.press("Enter");
      await expect.poll(() => page.evaluate(() => document.activeElement?.id ?? "")).toBe("main");
    });
  });

  test("TC-11: Accessibility menu is fully keyboard-operable", async ({ page, themeControls }) => {
    await test.step("Open home and open the accessibility menu via keyboard", async () => {
      await page.goto("/");
      await themeControls.a11yMenuTrigger.focus();
      await page.keyboard.press("Enter");
      await expect(themeControls.a11yMenu).toBeVisible();
    });

    await test.step("Arrow down to 'Extra veľké' (4th item) and verify focus", async () => {
      // Asserting focus between presses is load-bearing: Radix roving
      // focus moves focus in a setTimeout, so un-throttled ArrowDown
      // presses all resolve against the original item.
      await expect(themeControls.a11yFontOption("s")).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(themeControls.a11yFontOption("m")).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(themeControls.a11yFontOption("l")).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(themeControls.a11yFontOption("xl")).toBeFocused();
    });

    await test.step("Press Enter — the selection takes effect and the menu closes", async () => {
      await page.keyboard.press("Enter");
      await expect(themeControls.a11yMenu).toBeHidden();
      expect(await htmlFontSize(page)).toBe("125%");
      expect(await readLocalStorage(page, FONT_KEY)).toBe("xl");
    });
  });

  test("TC-12: Theme and accessibility triggers expose Slovak aria-labels", async ({
    page,
    themeControls,
  }) => {
    await test.step("Open home", async () => {
      await page.goto("/");
    });

    await test.step("Verify the theme toggle is reachable by role + name 'Vzhľad'", async () => {
      await expect(themeControls.themeToggleTriggerByRole).toBeVisible();
      await expect(themeControls.themeToggleTrigger).toHaveAttribute("aria-label", "Vzhľad");
    });

    await test.step("Verify the accessibility menu is reachable by role + name 'Prístupnosť'", async () => {
      await expect(themeControls.a11yMenuTriggerByRole).toBeVisible();
      await expect(themeControls.a11yMenuTrigger).toHaveAttribute("aria-label", "Prístupnosť");
    });
  });
});
