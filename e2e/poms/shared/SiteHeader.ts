import type { Locator, Page } from "@playwright/test";

/**
 * Mega-menu slugs (Phase 1, D1). Items either render as a flat link
 * (`MegaLinkSlug`) or as a hover trigger that opens a panel (`MegaTriggerSlug`).
 */
export type MegaLinkSlug = "pre_skoly" | "blog" | "podpora";
export type MegaTriggerSlug = "testy" | "skolenia";
export type MegaSlug = MegaLinkSlug | MegaTriggerSlug;

/**
 * Site header POM. Every element the spec asserts on has a getter or
 * method here — specs MUST NOT call `page.locator(...)` /
 * `page.getByTestId(...)` directly (per `.claude/CLAUDE.md` § Test IDs).
 *
 * Locator strategy is `data-testid` first, role/name second.
 *
 * Phase 1 (mega-menu): the desktop nav is a Radix `NavigationMenu` with
 * 5 top-level items, two of which (`testy`, `skolenia`) open hover panels;
 * the rest (`pre_skoly`, `blog`, `podpora`) are flat links.
 */
export class SiteHeader {
  constructor(private readonly page: Page) {}

  // ---------------------------------------------------------------------------
  // Structural locators
  // ---------------------------------------------------------------------------

  get root(): Locator {
    return this.page.getByTestId("header-root");
  }

  get nav(): Locator {
    return this.page.getByTestId("header-nav");
  }

  /**
   * The accessible "Hlavná navigácia" landmark — exposed for TCs that
   * specifically verify ARIA semantics (screen-reader landmark nav).
   * Uses role + name on purpose.
   */
  get navByRole(): Locator {
    return this.page.getByRole("navigation", { name: /Hlavná navigácia/i });
  }

  // ---------------------------------------------------------------------------
  // Desktop nav
  // ---------------------------------------------------------------------------

  get logoLink(): Locator {
    return this.page.getByTestId("header-logo-link");
  }

  get desktopNav(): Locator {
    return this.page.getByTestId("header-desktop-nav");
  }

  /** Plain link variant of a mega-menu item (no panel). */
  megaLink(slug: MegaLinkSlug): Locator {
    return this.page.getByTestId(`header-mega-link-${slug}`);
  }

  /** Trigger that opens a hover panel (the panel itself is `megaPanel`). */
  megaTrigger(slug: MegaTriggerSlug): Locator {
    return this.page.getByTestId(`header-mega-trigger-${slug}`);
  }

  /** Hover panel content root for a given top-level item. */
  megaPanel(slug: MegaTriggerSlug): Locator {
    return this.page.getByTestId(`header-mega-panel-${slug}`);
  }

  /** Individual sub-link inside a hover panel. */
  megaPanelLink(slug: MegaTriggerSlug, linkKey: string): Locator {
    return this.page.getByTestId(`header-mega-panel-link-${slug}-${linkKey}`);
  }

  /** Wrapper div for the desktop LocaleSwitcher slot (always in DOM; empty while flag is off). */
  get desktopLocaleSlot(): Locator {
    return this.page.getByTestId("header-desktop-locale");
  }

  /** Wrapper div for the mobile sheet LocaleSwitcher slot (always in DOM; empty while flag is off). */
  get mobileLocaleSlot(): Locator {
    return this.page.getByTestId("header-mobile-locale");
  }

  /** The locale-switcher trigger — only present when LOCALE_SWITCHER_ENABLED = true. */
  get localeSwitcherTrigger(): Locator {
    return this.page.getByTestId("locale-switcher-trigger");
  }

  /** The locale-switcher dropdown menu — only present when LOCALE_SWITCHER_ENABLED = true. */
  get localeSwitcherMenu(): Locator {
    return this.page.getByTestId("locale-switcher-menu");
  }

  /** The locale-switcher current-locale label — only present when LOCALE_SWITCHER_ENABLED = true. */
  get localeSwitcherCurrent(): Locator {
    return this.page.getByTestId("locale-switcher-current");
  }

  get ctaPill(): Locator {
    return this.page.getByTestId("header-cta-pill");
  }

  /** Long-form suffix ("rýchly ") visible only at lg breakpoints. */
  get ctaPillLongSuffix(): Locator {
    return this.page.getByTestId("header-cta-pill-long-suffix");
  }

  /** E54 — public docs link (desktop). Always present. */
  get navDocs(): Locator {
    return this.page.getByTestId("header-nav-docs");
  }

  /** E54 — login link (desktop). Present only when signed out. */
  get navLogin(): Locator {
    return this.page.getByTestId("header-nav-login");
  }

  // ---------------------------------------------------------------------------
  // Mobile sheet
  // ---------------------------------------------------------------------------

  get hamburgerTrigger(): Locator {
    return this.page.getByTestId("header-mobile-trigger");
  }

  /** Decorative hamburger icon inside the trigger button. */
  get hamburgerIcon(): Locator {
    return this.hamburgerTrigger.locator("svg");
  }

  get sheet(): Locator {
    return this.page.getByTestId("header-mobile-sheet");
  }

  get sheetCloseButton(): Locator {
    return this.page.getByTestId("header-mobile-close");
  }

  get sheetLogoLink(): Locator {
    return this.page.getByTestId("header-mobile-logo-link");
  }

  /**
   * Flat (no-panel) mobile nav link. For panel items (`testy`, `skolenia`)
   * use `sheetNavTrigger` to expand the accordion section, then
   * `sheetNavPanelLink` for sub-links.
   */
  sheetNavLink(slug: MegaLinkSlug): Locator {
    return this.page.getByTestId(`header-mobile-nav-link-${slug}`);
  }

  /** Accordion trigger for a panel item in the mobile sheet. */
  sheetNavTrigger(slug: MegaTriggerSlug): Locator {
    return this.page.getByTestId(`header-mobile-nav-trigger-${slug}`);
  }

  /** Sub-link inside an expanded mobile accordion panel. */
  sheetNavPanelLink(slug: MegaTriggerSlug, linkKey: string): Locator {
    return this.page.getByTestId(`header-mobile-nav-panel-link-${slug}-${linkKey}`);
  }

  get sheetCtaLink(): Locator {
    return this.page.getByTestId("header-mobile-cta");
  }

  /** E54 — public docs link inside the mobile sheet. */
  get sheetDocsLink(): Locator {
    return this.page.getByTestId("header-mobile-docs");
  }

  /** E54 — login link inside the mobile sheet (signed-out only). */
  get sheetLoginLink(): Locator {
    return this.page.getByTestId("header-mobile-login");
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async openMobileMenu(): Promise<void> {
    await this.hamburgerTrigger.click();
    await this.sheet.waitFor({ state: "visible" });
    // Wait out the slide-in animation — interacting (click / Escape) while
    // the sheet still animates races Radix focus management and Playwright's
    // element-stability check (flaky TC-12 / TC-17, 2026-06-12).
    await this.sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  }

  async closeMobileMenu(): Promise<void> {
    await this.sheetCloseButton.click();
    await this.sheet.waitFor({ state: "hidden" });
  }

  // ---------------------------------------------------------------------------
  // Computed-state helpers (return values, never assertions)
  // ---------------------------------------------------------------------------

  /** Computed CSS for sticky-position assertions. */
  async rootComputedStyle(): Promise<{ position: string; top: string; zIndex: string }> {
    return this.root.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { position: cs.position, top: cs.top, zIndex: cs.zIndex };
    });
  }
}
