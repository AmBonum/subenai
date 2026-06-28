import type { Locator, Page } from "@playwright/test";

/**
 * Academy hub POM (E55) — the unified /academy index listing articles +
 * interactive lessons, with type tabs and free-text search. Replaces the
 * legacy BlogIndexPage/CoursesCatalog POMs. Locator strategy is
 * `data-testid` first.
 */
export class AcademyIndexPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/academy");
  }

  get root(): Locator {
    return this.page.getByTestId("academy-index-root");
  }

  get cards(): Locator {
    return this.page.getByTestId("academy-index-card");
  }

  /** Type filter tab: "all" | "lesson" | "article". */
  typeTab(value: "all" | "lesson" | "article"): Locator {
    return this.page.getByTestId(`academy-index-tab-${value}`);
  }

  get search(): Locator {
    return this.page.getByTestId("academy-index-search");
  }

  get empty(): Locator {
    return this.page.getByTestId("academy-index-empty");
  }
}
