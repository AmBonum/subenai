import type { Locator, Page } from "@playwright/test";

/**
 * 404 page POM — `src/components/layout/NotFoundPage.tsx` (E22 senior
 * 404 surface: kicker + h1 + body + suggestion cards).
 *
 * Renders for any unknown route. Intentionally does NOT include
 * `<Footer>`; tests that assert footer absence on 404 use this POM
 * for the positive heading checks.
 */
export class NotFoundPage {
  constructor(private readonly page: Page) {}

  /** The h1 — Slovak copy "Stránka nenájdená". */
  get heading(): Locator {
    return this.page.getByTestId("not-found-title");
  }

  /** Kicker line above the h1 — carries the literal "404". */
  get kicker(): Locator {
    return this.page.getByTestId("not-found-kicker");
  }

  /** Body paragraph under the h1. */
  get subheading(): Locator {
    return this.page.getByTestId("not-found-body");
  }

  /** Back-to-home CTA — the way out of the standalone 404 page. */
  get homeCta(): Locator {
    return this.page.getByTestId("not-found-home-cta");
  }
}
