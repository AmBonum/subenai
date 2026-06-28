import type { Locator, Page } from "@playwright/test";

/**
 * E56 — mobile bottom tab bar POM. The primary mobile navigation: a
 * `position: fixed` `<nav>` pinned to the viewport bottom, hidden from the
 * `lg` breakpoint up. Five items: home / tests / quicktest (raised centre
 * CTA) / academy, plus a menu button that opens the shared header sheet
 * (`header-mobile-sheet`).
 *
 * Locator strategy is `data-testid` only — specs MUST NOT call
 * `page.locator(...)` / `page.getByTestId(...)` directly
 * (per `.claude/CLAUDE.md` § Test IDs).
 */
export class MobileBottomNav {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.getByTestId("mobile-bottomnav-root");
  }

  /** Link to `/`. */
  get home(): Locator {
    return this.page.getByTestId("mobile-bottomnav-item-home");
  }

  /** Link to `/tests`. */
  get tests(): Locator {
    return this.page.getByTestId("mobile-bottomnav-item-tests");
  }

  /** Raised centre CTA — link to `/test` (replaces the old header-cta-mobile-bar). */
  get quicktest(): Locator {
    return this.page.getByTestId("mobile-bottomnav-item-quicktest");
  }

  /** Link to `/academy`. */
  get academy(): Locator {
    return this.page.getByTestId("mobile-bottomnav-item-academy");
  }

  /** Button (aria-haspopup="dialog") that opens the shared header-mobile-sheet. */
  get menu(): Locator {
    return this.page.getByTestId("mobile-bottomnav-item-menu");
  }

  /** Click the menu button to open the shared header sheet. */
  async openMenu(): Promise<void> {
    await this.menu.click();
  }
}
