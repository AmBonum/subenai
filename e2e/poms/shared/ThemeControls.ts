import type { Locator, Page } from "@playwright/test";

export type ThemeMode = "light" | "dark" | "system";
export type FontSizeOption = "s" | "m" | "l" | "xl";
export type MotionOption = "system" | "on" | "off";

/**
 * Theme + accessibility controls POM (E52). The same `ThemeToggle` /
 * `AccessibilityMenu` components render with identical test-ids in the
 * public `SiteHeader`, its mobile sheet, and the `/app` shell — exactly
 * one instance is in the DOM at a time (the sheet mounts its copy only
 * while open), so a single shared POM covers every surface.
 */
export class ThemeControls {
  constructor(private readonly page: Page) {}

  // ---------------------------------------------------------------------------
  // Theme toggle
  // ---------------------------------------------------------------------------

  get themeToggleTrigger(): Locator {
    return this.page.getByTestId("theme-toggle-trigger");
  }

  get themeToggleMenu(): Locator {
    return this.page.getByTestId("theme-toggle-menu");
  }

  themeToggleOption(mode: ThemeMode): Locator {
    return this.page.getByTestId(`theme-toggle-option-${mode}`);
  }

  /** Check icon rendered only on the currently-active theme option. */
  themeToggleCheck(mode: ThemeMode): Locator {
    return this.page.getByTestId(`theme-toggle-check-${mode}`);
  }

  /**
   * Role + accessible-name variant — for TCs that specifically verify
   * ARIA semantics (aria-label "Vzhľad"). Uses role on purpose.
   */
  get themeToggleTriggerByRole(): Locator {
    return this.page.getByRole("button", { name: "Vzhľad" });
  }

  // ---------------------------------------------------------------------------
  // Accessibility menu
  // ---------------------------------------------------------------------------

  get a11yMenuTrigger(): Locator {
    return this.page.getByTestId("a11y-menu-trigger");
  }

  get a11yMenu(): Locator {
    return this.page.getByTestId("a11y-menu");
  }

  a11yFontOption(size: FontSizeOption): Locator {
    return this.page.getByTestId(`a11y-menu-font-${size}`);
  }

  a11yFontCheck(size: FontSizeOption): Locator {
    return this.page.getByTestId(`a11y-menu-font-check-${size}`);
  }

  a11yMotionOption(state: MotionOption): Locator {
    return this.page.getByTestId(`a11y-menu-motion-${state}`);
  }

  a11yMotionCheck(state: MotionOption): Locator {
    return this.page.getByTestId(`a11y-menu-motion-check-${state}`);
  }

  /**
   * Role + accessible-name variant — for TCs that specifically verify
   * ARIA semantics (aria-label "Prístupnosť"). Uses role on purpose.
   */
  get a11yMenuTriggerByRole(): Locator {
    return this.page.getByRole("button", { name: "Prístupnosť" });
  }

  // ---------------------------------------------------------------------------
  // Skip-to-content link
  // ---------------------------------------------------------------------------

  get skipLink(): Locator {
    return this.page.getByTestId("skip-to-content-link");
  }
}
