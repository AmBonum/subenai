import type { Locator, Page } from "@playwright/test";

/**
 * Academy entry POM (E55) — one article or interactive lesson at
 * /academy/$slug. Replaces the legacy BlogPostPage/CourseDetail POMs.
 * Locator strategy is `data-testid` first.
 */
export class AcademyEntryPage {
  constructor(private readonly page: Page) {}

  async openSlug(slug: string): Promise<void> {
    await this.page.goto(`/academy/${slug}`);
  }

  get root(): Locator {
    return this.page.getByTestId("academy-entry-root");
  }

  get title(): Locator {
    return this.page.getByTestId("academy-entry-title");
  }

  get body(): Locator {
    return this.page.getByTestId("academy-body");
  }

  /** Inline interactive quiz widget (migrated course example). */
  get quiz(): Locator {
    return this.page.getByTestId("academy-quiz");
  }

  /** Realistic scam mockup migrated from a course example section. */
  get visual(): Locator {
    return this.page.getByTestId("academy-visual");
  }

  // Not-found state (unknown slug) — rendered by academy.$slug.lazy.
  get notFound(): Locator {
    return this.page.getByTestId("academy-entry-notfound");
  }

  get notFoundBackLink(): Locator {
    return this.notFound.getByRole("link");
  }
}
