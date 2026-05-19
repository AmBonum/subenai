import type { Page, Response } from "@playwright/test";

/**
 * Base class for every Page Object Model in this project.
 *
 * What lives here:
 *   - the `page` instance every POM needs
 *   - tiny generic helpers (waitForReady, gotoPath) that have ONE
 *     correct shape app-wide and benefit from being shared
 *
 * What does NOT live here:
 *   - feature-specific selectors (those go in subclasses like QuizPage)
 *   - app-wide UI primitives (ConsentBanner, SiteHeader) — those are
 *     their own POMs in `poms/shared/` so multiple page POMs can
 *     compose them via fixtures, not inheritance
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Navigate to a path relative to the configured baseURL and wait for
   * the network to settle. Use this instead of raw `page.goto()` so the
   * "wait" semantics are uniform across POMs.
   */
  async goto(path: string): Promise<Response | null> {
    const response = await this.page.goto(path, { waitUntil: "domcontentloaded" });
    // Bounded networkidle wait — supabase-js schedules a low-frequency
    // visibility-change refresh that, under playwright mocks, never
    // settles to fully idle. 3s is enough for legitimate page bootstrap
    // and short enough that the test stays interactive.
    await this.page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {
      /* networkidle can be flaky on long-lived poll endpoints — domcontentloaded is the contract */
    });
    return response;
  }

  /**
   * Single source of truth for "the SPA is rendered". Tests assert
   * against this, not against a feature heading, so a 404 / 500 doesn't
   * silently pass because the heading happens to also exist on the
   * error page.
   */
  async waitForAppShell(): Promise<void> {
    await this.page.locator("header[role='banner']").waitFor({ state: "visible" });
  }
}
